import { useState, useEffect, useRef } from 'react';
import { Card } from '../types';
import { saveCards, loadCards } from '../utils/storage';
import { saveImage as saveImageToIndexedDB, cacheImageBlob, blobURLToBlob, getImage } from '../utils/indexedDB';
import { useAuth } from '../contexts/AuthContext';
import { useSetContext } from '../contexts/SetContext';
import { CardRepository } from '../repositories/CardRepository';

const MIN_CARDS = 20;
/** Tiempo (ms) que el botón "Generar con IA" permanece deshabilitado tras añadir una carta (evita race con Supabase) */
const SYNC_COOLDOWN_MS = 2500;

/** Supabase error when update/delete returns 0 rows (e.g. row does not exist or RLS) */
const PGRST116 = 'PGRST116';

/** Descargas paralelas por batch (evita saturar la conexión pero acelera vs secuencial). */
const PREFETCH_BATCH_SIZE = 6;

export const useCards = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentlySyncedCardIds, setRecentlySyncedCardIds] = useState<Set<string>>(new Set());
  const cardsRef = useRef<Card[]>([]);
  cardsRef.current = cards;
  const { user } = useAuth();
  const { currentSetId, setCurrentSetId, sets } = useSetContext();

  const isCardRecentlySynced = (id: string) => recentlySyncedCardIds.has(id);

  useEffect(() => {
    let cancelled = false;

    const loadCardsData = async () => {
      setIsLoading(true);
      try {
        if (user && currentSetId) {
          const cloudCards = await CardRepository.getCards(user.id, currentSetId);
          const localCards = await loadCards();
          if (localCards.length > 0 && cloudCards.length === 0) {
            await migrateLocalToCloud(localCards, user.id, currentSetId);
            if (cancelled) return;
            const updated = await CardRepository.getCards(user.id, currentSetId);
            if (!cancelled) setCards(updated);
            setIsLoading(false);
            prefetchAndHydrateParallel(updated, () => cancelled).then(async () => {
              if (cancelled) return;
              const hydrated = await hydrateCards(updated);
              if (!cancelled) setCards(hydrated);
            });
            return;
          } else {
            if (cloudCards.length === 0) {
              setCards([]);
            } else {
              if (!cancelled) setCards(cloudCards);
              setIsLoading(false);
              prefetchAndHydrateParallel(cloudCards, () => cancelled).then(async () => {
                if (cancelled) return;
                const hydrated = await hydrateCards(cloudCards);
                if (!cancelled) setCards(hydrated);
              });
              return;
            }
          }
        } else if (!user) {
          setCards(await loadCards());
        } else {
          /* user existe pero currentSetId aún no cargó (SetContext async).
             No borrar cartas; esperar a que currentSetId esté disponible. */
        }
      } catch (error) {
        console.error('Error loading cards:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    async function prefetchAndHydrateParallel(cardList: Card[], isCancelled: () => boolean) {
      const withPath = cardList.filter(c => c.imagePath);
      for (let i = 0; i < withPath.length; i += PREFETCH_BATCH_SIZE) {
        if (isCancelled()) return;
        const batch = withPath.slice(i, i + PREFETCH_BATCH_SIZE);
        await Promise.all(
          batch.map(async (card) => {
            if (isCancelled()) return;
            try {
              const blob = await CardRepository.downloadImage(card.imagePath!);
              if (!isCancelled()) await cacheImageBlob(card.id, blob);
            } catch (_) {
              // La carta conserva signed URL
            }
          })
        );
      }
    }

    async function hydrateCards(cardList: Card[]): Promise<Card[]> {
      return Promise.all(
        cardList.map(async (card) => {
          const url = await getImage(card.id);
          return { ...card, image: url ?? card.image };
        })
      );
    }

    loadCardsData();
    return () => {
      cancelled = true;
    };
  }, [user, currentSetId]);

  const migrateLocalToCloud = async (localCards: Card[], userId: string, setId: string) => {
    for (const card of localCards) {
      try {
        let imagePath: string | undefined;
        let originalImagePath: string | undefined;

        if (card.image) {
          const blob = await blobURLToBlob(card.image);
          imagePath = await CardRepository.uploadImage(userId, card.id, blob);
          try {
            await saveImageToIndexedDB(card.id, blob);
          } catch (_) {
            // Caché local opcional; no fallar la migración
          }
        }

        if (card.originalImage) {
          const blob = await blobURLToBlob(card.originalImage);
          originalImagePath = await CardRepository.uploadImage(userId, card.id, blob, true);
        }

        await CardRepository.createCard({
          id: card.id,
          title: card.title,
          user_id: userId,
          set_id: setId,
          image_path: imagePath,
          original_image_path: originalImagePath,
          is_ai_generated: card.isAiGenerated || false
        });
      } catch (err) {
        console.error(`Failed to migrate card ${card.id}:`, err);
      }
    }
    const { clearAllImages } = await import('../utils/indexedDB');
    await clearAllImages();
    await saveCards([]);
  };

  const addCard = async (card: Card) => {
    try {
      if (user) {
        let imagePath: string | undefined;
        if (card.image && card.image.startsWith('data:')) {
          imagePath = await CardRepository.uploadImage(user.id, card.id, card.image);
          try {
            await saveImageToIndexedDB(card.id, card.image);
          } catch (_) {
            // Caché local opcional
          }
        }

        if (!currentSetId) {
          console.error('addCard: currentSetId is null, cannot save to cloud');
          throw new Error('NO_SET_SELECTED');
        }
        await CardRepository.createCard({
          id: card.id,
          title: card.title,
          user_id: user.id,
          set_id: currentSetId,
          image_path: imagePath,
          is_ai_generated: card.isAiGenerated || false
        });

        const cloudCards = await CardRepository.getCards(user.id, currentSetId);
        setCards(cloudCards);
        setRecentlySyncedCardIds(prev => new Set(prev).add(card.id));
        setTimeout(() => {
          setRecentlySyncedCardIds(prev => {
            const next = new Set(prev);
            next.delete(card.id);
            return next;
          });
        }, SYNC_COOLDOWN_MS);
      } else {
        // Guest Mode (Local Storage)
        if (card.image && card.image.startsWith('data:')) {
          const blobURL = await saveImageToIndexedDB(card.id, card.image);
          card = { ...card, image: blobURL };
        }

        setCards(prevCards => {
          const newCards = [...prevCards, card];
          saveCards(newCards);
          return newCards;
        });
      }
    } catch (error) {
      console.error('Error adding card:', error);
      const msg = error instanceof Error && error.message === 'NO_SET_SELECTED'
        ? 'No hay una lotería seleccionada. Por favor, recarga la página o crea una nueva lotería desde el menú.'
        : 'Error al agregar la carta. Por favor, intenta nuevamente.';
      alert(msg);
    }
  };

  const addCards = async (
    newCards: Card[],
    options?: { onProgress?: (current: number, total: number) => void }
  ) => {
    try {
      if (user) {
        if (!currentSetId) {
          console.error('addCards: currentSetId is null, cannot save to cloud');
          throw new Error('NO_SET_SELECTED');
        }
        const total = newCards.length;
        for (let i = 0; i < newCards.length; i++) {
          const card = newCards[i];
          let imagePath: string | undefined;
          let originalImagePath: string | undefined;

          if (card.image && card.image.startsWith('data:')) {
            imagePath = await CardRepository.uploadImage(user.id, card.id, card.image);
            try {
              await saveImageToIndexedDB(card.id, card.image);
            } catch (_) {
              // Caché local opcional
            }
          }
          if (card.originalImage && card.originalImage.startsWith('data:')) {
            originalImagePath = await CardRepository.uploadImage(user.id, card.id, card.originalImage, true);
          }

          await CardRepository.createCard({
            id: card.id,
            title: card.title,
            user_id: user.id,
            set_id: currentSetId,
            image_path: imagePath,
            original_image_path: originalImagePath,
            is_ai_generated: card.isAiGenerated || false
          });
          options?.onProgress?.(i + 1, total);
        }
        const cloudCards = await CardRepository.getCards(user.id, currentSetId!);
        setCards(cloudCards);
        const newIds = newCards.map(c => c.id);
        setRecentlySyncedCardIds(prev => new Set([...prev, ...newIds]));
        setTimeout(() => {
          setRecentlySyncedCardIds(prev => {
            const next = new Set(prev);
            newIds.forEach(id => next.delete(id));
            return next;
          });
        }, SYNC_COOLDOWN_MS);
      } else {
        // Guest Mode
        const cardsWithImages = await Promise.all(
          newCards.map(async (card) => {
            if (card.image && card.image.startsWith('data:')) {
              try {
                const blobURL = await saveImageToIndexedDB(card.id, card.image);
                card = { ...card, image: blobURL };
              } catch (error) {
                console.error(`Error saving image for card ${card.id}:`, error);
              }
            }

            if (card.originalImage && card.originalImage.startsWith('data:')) {
              try {
                const blobURL = await saveImageToIndexedDB(`${card.id}_orig`, card.originalImage);
                card = { ...card, originalImage: blobURL };
              } catch (error) {
                console.error(`Error saving original image for card ${card.id}:`, error);
              }
            }
            return card;
          })
        );

        setCards((prevCards: Card[]) => {
          const updatedCards = [...prevCards, ...cardsWithImages];
          saveCards(updatedCards).catch(console.error);
          return updatedCards;
        });
      }
    } catch (error) {
      console.error('Error adding cards:', error);
      const msg = error instanceof Error && error.message === 'NO_SET_SELECTED'
        ? 'No hay una lotería seleccionada. Por favor, recarga la página o crea una nueva lotería desde el menú.'
        : 'Error al agregar las cartas. Por favor, intenta nuevamente.';
      alert(msg);
    }
  };

  const removeCard = async (cardId: string) => {
    try {
      if (user) {
        await CardRepository.deleteCard(cardId);
      } else {
        const { deleteImage } = await import('../utils/indexedDB');
        await deleteImage(cardId);
      }
    } catch (error) {
      console.error('Error removing card:', error);
      return;
    }
    // Actualizar la UI siempre tras un delete exitoso (o tras delete en DB aunque falle storage)
    setCards((prevCards: Card[]) => {
      const newCards = prevCards.filter(card => card.id !== cardId);
      if (!user) saveCards(newCards).catch(console.error);
      return newCards;
    });
  };

  const clearCards = async () => {
    try {
      if (user) {
        // In Supabase we should probably delete all cards for the user
        // For now let's just do it sequentially or provide a bulk delete in Repo
        for (const card of cards) {
          await CardRepository.deleteCard(card.id);
        }
        setCards([]);
      } else {
        const { clearAllImages } = await import('../utils/indexedDB');
        await clearAllImages();
        setCards([]);
        await saveCards([]);
      }
    } catch (error) {
      console.error('Error clearing cards:', error);
    }
  };

  const updateCard = async (id: string, updates: Partial<Card>) => {
    try {
      if (user) {
        let imagePath: string | undefined;
        let originalImagePath: string | undefined;

        if (updates.image) {
          if (updates.image.startsWith('data:')) {
            imagePath = await CardRepository.uploadImage(user.id, id, updates.image);
            try {
              await saveImageToIndexedDB(id, updates.image);
            } catch (_) {
              // Caché local opcional
            }
          } else if (updates.image.startsWith('http://') || updates.image.startsWith('https://')) {
            const response = await fetch(updates.image);
            const blob = await response.blob();
            imagePath = await CardRepository.uploadImage(user.id, id, blob);
            try {
              await saveImageToIndexedDB(id, blob);
            } catch (_) {
              // Caché local opcional
            }
          }
        }
        if (updates.originalImage) {
          if (updates.originalImage.startsWith('data:')) {
            originalImagePath = await CardRepository.uploadImage(user.id, id, updates.originalImage, true);
          } else if (updates.originalImage.startsWith('http://') || updates.originalImage.startsWith('https://')) {
            const response = await fetch(updates.originalImage);
            const blob = await response.blob();
            originalImagePath = await CardRepository.uploadImage(user.id, id, blob, true);
          }
        }

        const cardUpdates: { title?: string; image_path?: string; original_image_path?: string; is_ai_generated?: boolean } = {};
        if (updates.title !== undefined) cardUpdates.title = updates.title;
        if (updates.isAiGenerated !== undefined) cardUpdates.is_ai_generated = updates.isAiGenerated;
        if (imagePath !== undefined) cardUpdates.image_path = imagePath;
        if (originalImagePath !== undefined) cardUpdates.original_image_path = originalImagePath;

        if (Object.keys(cardUpdates).length === 0) {
          setCards((prevCards: Card[]) =>
            prevCards.map(card => card.id === id ? { ...card, ...updates } : card)
          );
          return true;
        }

        try {
          await CardRepository.updateCard(id, cardUpdates, user.id);
        } catch (updateErr: unknown) {
          const err = updateErr as { code?: string; message?: string };
          const isZeroRows = err?.code === PGRST116 || err?.code === '406' ||
            (err?.message && (String(err.message).includes('0 rows') || String(err.message).includes('406') || String(err.message).includes('Not Acceptable')));
          if (isZeroRows) {
            const currentCard = cardsRef.current.find(c => c.id === id);
            if (!currentCard || !user) throw updateErr;
            let upsertImagePath = imagePath;
            let upsertOriginalPath = originalImagePath;
            if (!upsertImagePath && currentCard.image) {
              if (currentCard.image.startsWith('data:')) {
                upsertImagePath = await CardRepository.uploadImage(user.id, id, currentCard.image);
                try {
                  await saveImageToIndexedDB(id, currentCard.image);
                } catch (_) {
                  // Caché local opcional
                }
              } else if (currentCard.image.startsWith('http')) {
                const res = await fetch(currentCard.image);
                const blob = await res.blob();
                upsertImagePath = await CardRepository.uploadImage(user.id, id, blob);
                try {
                  await saveImageToIndexedDB(id, blob);
                } catch (_) {
                  // Caché local opcional
                }
              }
            }
            if (!upsertOriginalPath && currentCard.originalImage) {
              if (currentCard.originalImage.startsWith('data:')) {
                upsertOriginalPath = await CardRepository.uploadImage(user.id, id, currentCard.originalImage, true);
              } else if (currentCard.originalImage.startsWith('http')) {
                const res = await fetch(currentCard.originalImage);
                const blob = await res.blob();
                upsertOriginalPath = await CardRepository.uploadImage(user.id, id, blob, true);
              }
            }
            // Upsert: inserta si no existe, actualiza si ya existe (evita 409 en cartas individuales).
            if (currentSetId) {
              await CardRepository.upsertCard({
                id,
                title: updates.title ?? currentCard.title,
                user_id: user.id,
                set_id: currentSetId,
                image_path: upsertImagePath,
                original_image_path: upsertOriginalPath,
                is_ai_generated: updates.isAiGenerated ?? currentCard.isAiGenerated ?? false
              });
            }
            imagePath = upsertImagePath;
            originalImagePath = upsertOriginalPath;
          } else {
            throw updateErr;
          }
        }

        const imageUrl = imagePath ? await CardRepository.getImageUrl(imagePath) : undefined;
        const originalImageUrl = originalImagePath ? await CardRepository.getImageUrl(originalImagePath) : undefined;

        setCards((prevCards: Card[]) => {
          return prevCards.map(card => card.id === id ? {
            ...card,
            ...updates,
            ...(imageUrl ? { image: imageUrl } : {}),
            ...(originalImageUrl ? { originalImage: originalImageUrl } : {})
          } : card);
        });
      } else {
        let updatedImage = updates.image;
        if (updatedImage && updatedImage.startsWith('data:')) {
          const { saveImage } = await import('../utils/indexedDB');
          const blobURL = await saveImage(id, updatedImage);
          updatedImage = blobURL;
        }

        let updatedOriginalImage = updates.originalImage;
        if (updatedOriginalImage && updatedOriginalImage.startsWith('data:')) {
          const { saveImage } = await import('../utils/indexedDB');
          const blobURL = await saveImage(`${id}_orig`, updatedOriginalImage);
          updatedOriginalImage = blobURL;
        }

        setCards((prevCards: Card[]) => {
          const newCards = prevCards.map(card =>
            card.id === id ? {
              ...card,
              ...updates,
              ...(updatedImage ? { image: updatedImage } : {}),
              ...(updatedOriginalImage ? { originalImage: updatedOriginalImage } : {})
            } : card
          );
          saveCards(newCards);
          return newCards;
        });
      }
      return true;
    } catch (error) {
      console.error('Error updating card:', error);
      alert('Error al actualizar la carta. Por favor, intenta nuevamente.');
      return false;
    }
  };

  const updateCards = async (updates: Array<{ id: string; updates: Partial<Card> }>) => {
    try {
      if (user) {
        // Batch update to cloud (base64 o URL de IA → subir a Storage)
        for (const u of updates) {
          let imagePath: string | undefined;
          let originalImagePath: string | undefined;

          if (u.updates.image) {
            if (u.updates.image.startsWith('data:')) {
              imagePath = await CardRepository.uploadImage(user.id, u.id, u.updates.image);
              try {
                await saveImageToIndexedDB(u.id, u.updates.image);
              } catch (_) {
                // Caché local opcional
              }
            } else if (u.updates.image.startsWith('http://') || u.updates.image.startsWith('https://')) {
              const response = await fetch(u.updates.image);
              const blob = await response.blob();
              imagePath = await CardRepository.uploadImage(user.id, u.id, blob);
              try {
                await saveImageToIndexedDB(u.id, blob);
              } catch (_) {
                // Caché local opcional
              }
            }
          }
          if (u.updates.originalImage) {
            if (u.updates.originalImage.startsWith('data:')) {
              originalImagePath = await CardRepository.uploadImage(user.id, u.id, u.updates.originalImage, true);
            } else if (u.updates.originalImage.startsWith('http://') || u.updates.originalImage.startsWith('https://')) {
              const response = await fetch(u.updates.originalImage);
              const blob = await response.blob();
              originalImagePath = await CardRepository.uploadImage(user.id, u.id, blob, true);
            }
          }

          const batchCardUpdates: { title?: string; image_path?: string; original_image_path?: string; is_ai_generated?: boolean } = {};
          if (u.updates.title !== undefined) batchCardUpdates.title = u.updates.title;
          if (u.updates.isAiGenerated !== undefined) batchCardUpdates.is_ai_generated = u.updates.isAiGenerated;
          if (imagePath !== undefined) batchCardUpdates.image_path = imagePath;
          if (originalImagePath !== undefined) batchCardUpdates.original_image_path = originalImagePath;
          await CardRepository.updateCard(u.id, batchCardUpdates, user.id);
        }

        if (!currentSetId) return false;
        const cloudCards = await CardRepository.getCards(user.id, currentSetId);
        setCards(cloudCards);
        return true;
      } else {
        const { saveImage } = await import('../utils/indexedDB');
        const processedUpdates = await Promise.all(
          updates.map(async (u) => {
            let img = u.updates.image;
            if (img) {
              if (img.startsWith('data:')) {
                img = await saveImage(u.id, img);
              } else if (img.startsWith('http://') || img.startsWith('https://')) {
                const response = await fetch(img);
                const blob = await response.blob();
                img = await saveImage(u.id, blob);
              }
            }
            let orig = u.updates.originalImage;
            if (orig) {
              if (orig.startsWith('data:')) {
                orig = await saveImage(`${u.id}_orig`, orig);
              } else if (orig.startsWith('http://') || orig.startsWith('https://')) {
                const response = await fetch(orig);
                const blob = await response.blob();
                orig = await saveImage(`${u.id}_orig`, blob);
              }
            }
            return {
              id: u.id,
              updates: {
                ...u.updates,
                ...(img ? { image: img } : {}),
                ...(orig ? { originalImage: orig } : {})
              }
            };
          })
        );

        return new Promise<boolean>((resolve) => {
          setCards((prevCards: Card[]) => {
            const finalCards = prevCards.map(card => {
              const up = processedUpdates.find(pu => pu.id === card.id);
              return up ? { ...card, ...up.updates } : card;
            });

            saveCards(finalCards).then(() => resolve(true)).catch(() => resolve(false));
            return finalCards;
          });
        });
      }
    } catch (error) {
      console.error('Error batch updating cards:', error);
      return false;
    }
  };

  const hasMinimumCards = cards.length >= MIN_CARDS;

  return {
    cards,
    isLoading,
    addCard,
    addCards,
    removeCard,
    updateCard,
    updateCards,
    clearCards,
    hasMinimumCards,
    cardCount: cards.length,
    minCards: MIN_CARDS,
    isCardRecentlySynced,
    sets,
    currentSetId,
    setCurrentSetId,
  };
};

