// Tipos mínimos del runtime de Deno que usan las edge functions, para poder
// verificarlas con tsc (npm run typecheck:functions) sin instalar Deno.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};
