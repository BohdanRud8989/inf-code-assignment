import { Suspense } from "react";
import Image from "next/image";

import { api, HydrateClient } from "~/trpc/server";
import infSvg from "../../public/inf-logo-large.svg";
import {
  CreatePostForm,
  PostCardSkeleton,
  PostList,
} from "./_components/posts";

export default function HomePage() {
  return (
    <HydrateClient>
      <main className="container h-screen py-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <h1 className="text-5xl font-thin tracking-tight sm:text-[5rem]">
            Create{" "}
            <span>
              <Image
                className="inline pb-4"
                /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
                src={infSvg?.src}
                alt="INF"
                width={128}
                height={128}
              />
            </span>{" "}
            Posts
          </h1>

          <CreatePostForm />
          <div className="max-h-list w-full max-w-2xl overflow-y-scroll">
            <Suspense
              fallback={
                <div className="flex w-full flex-col gap-4">
                  <PostCardSkeleton />
                  <PostCardSkeleton />
                  <PostCardSkeleton />
                </div>
              }
            >
              <PostList />
            </Suspense>
          </div>
        </div>
      </main>
    </HydrateClient>
  );
}
