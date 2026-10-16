import type { ReactNode } from "react";

export function StaticPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl sm:text-6xl">{title}</h1>
      {intro ? <p className="mt-4 text-lg text-muted-foreground">{intro}</p> : null}
      <div className="mt-8 space-y-6 leading-relaxed [&_h2]:mt-10 [&_h2]:text-2xl [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </article>
  );
}
