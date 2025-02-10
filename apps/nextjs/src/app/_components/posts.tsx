"use client";

import type { ZodType } from "zod";
import { useState } from "react";
import { z } from "zod";

import type { RouterOutputs } from "@inf/api";
import type { Insertable } from "@inf/db/helpers";
import type { posts } from "@inf/db/types";
import { cn } from "@inf/ui";
import { Button } from "@inf/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  useForm,
} from "@inf/ui/form";
import { Input } from "@inf/ui/input";
import { toast } from "@inf/ui/toast";
import { Tooltip } from "@inf/ui/tooltip";

import { getRelativeTime } from "~/app/utils";
import { api } from "~/trpc/react";

const MANDATORY_FIELDS = ["title", "content"];

export function CreatePostForm() {
  const [error, setError] = useState<string | undefined>(undefined);
  const form = useForm({
    schema: z.object({
      title: z.string(),
      content: z.string(),
      author_id: z.string(),
    }) satisfies ZodType<Insertable<posts>>,
    defaultValues: {
      content: "",
      title: "",
      author_id: "",
    },
  });

  const utils = api.useUtils();
  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      form.reset();
      await utils.post.invalidate();
    },
    onError: (err) => {
      toast.error(
        err.data?.code === "UNAUTHORIZED"
          ? "You must be logged in to post"
          : "Failed to create post",
      );
    },
  });

  const handleSubmitForm = form.handleSubmit(async (formFields) => {
    if (MANDATORY_FIELDS.some((field) => !formFields[field])) {
      setError("Title and content are required");
      return;
    }

    setError(undefined);
    await createPost.mutate(formFields);
  });

  return (
    <Form {...form}>
      <form
        data-testid="post-form"
        className="flex w-full max-w-2xl flex-col gap-4"
        action={"/"}
        onSubmit={handleSubmitForm}
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} placeholder="Title" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input {...field} placeholder="Content" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <h6 className="text-red-500">{error}</h6>}
        <Button type="submit">Create</Button>
      </form>
    </Form>
  );
}

export function PostList() {
  const postsQuery = api.post.all.useQuery();
  const posts = postsQuery.data ?? [];

  if (posts.length === 0) {
    return (
      <div className="relative flex min-h-16 w-full flex-col gap-4">
        <PostCardSkeleton pulse={postsQuery.isFetching} />
        <PostCardSkeleton pulse={postsQuery.isFetching} />
        <PostCardSkeleton pulse={postsQuery.isFetching} />

        {!postsQuery.isFetching && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-bold text-stone-500/[0.5]">
              No posts yet
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      {posts.map((p) => {
        return <PostCard key={p.id} post={p} />;
      })}
    </div>
  );
}

export function EditablePostTitle(props: {
  post: RouterOutputs["post"]["all"][number];
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [title, setTitle] = useState<string>(props.post.title);
  const [tempTitle, setTempTitle] = useState<string>(props.post.title);
  const utils = api.useUtils();

  const updatePost = api.post.update.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
    },
    onError: (err) => {
      toast.error(
        err.data?.code === "UNAUTHORIZED"
          ? "You must be logged in to update post"
          : "Failed to update post",
      );
    },
  });

  const handleSubmitTitle = async () => {
    setIsEditMode(false);
    setTitle(tempTitle);
    await updatePost.mutate({ ...props.post, title: tempTitle });
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setTempTitle(title);
  };

  const handleTitleChange = (event) => {
    setTempTitle(event.target.value);
  };

  const handleListenToEvents = async (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      await handleSubmitTitle();
    } else if (event.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <>
      {isEditMode ? (
        <section>
          <textarea
            value={tempTitle}
            onKeyDown={handleListenToEvents}
            onChange={handleTitleChange}
            autoFocus
          />
          <div>
            <Button onClick={handleSubmitTitle}>Create</Button>
            <Button onClick={handleCancel} variant="ghost">
              Cancel
            </Button>
          </div>
        </section>
      ) : (
        <section className="flex flex-row justify-between gap-5">
          <h2
            className="line-clamp-2 text-2xl font-bold dark:text-white"
            data-testid="editable-post-title"
            role="heading"
            onClick={() => {
              setIsEditMode(true);
            }}
          >
            {title}
          </h2>
          <div className="flex flex-row gap-1">
            {props.post.created_at && (
              <Tooltip content="Creation date">
                <span className="badge pr-2 text-white">
                  {getRelativeTime(props.post.created_at)}
                </span>
              </Tooltip>
            )}
            {props.post.updated_at && (
              <Tooltip content="Update date">
                <span className="badge bg-cyan-500">
                  {getRelativeTime(props.post.updated_at)}
                </span>
              </Tooltip>
            )}
          </div>
        </section>
      )}
    </>
  );
}

export function PostCard(props: {
  post: RouterOutputs["post"]["all"][number];
}) {
  const utils = api.useUtils();
  const deletePost = api.post.delete.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate();
    },
    onError: (err) => {
      toast.error(
        err.data?.code === "UNAUTHORIZED"
          ? "You must be logged in to delete a post"
          : "Failed to delete post",
      );
    },
  });

  // used generic window method since I have no access to your internal UI library(documentation)
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      deletePost.mutate({ id: props.post.id });
    }
  };

  return (
    <div className="flex flex-col gap-5 rounded-lg bg-muted p-4">
      <EditablePostTitle post={props.post} />
      <p className="line-clamp-5 text-sm">{props.post.content}</p>
      <Button
        className="cursor-pointer bg-red-600 text-sm font-bold uppercase text-white hover:bg-red-500"
        onClick={handleDelete}
      >
        Delete
      </Button>
    </div>
  );
}

export function PostCardSkeleton(props: { pulse?: boolean }) {
  const { pulse = true } = props;
  return (
    <div className="flex flex-row rounded-lg bg-muted p-4">
      <div className="flex-grow">
        <h2
          className={cn(
            "w-1/4 rounded bg-stone-500/[0.2] text-2xl font-bold",
            pulse && "animate-pulse",
          )}
        >
          &nbsp;
        </h2>
        <p
          className={cn(
            "mt-2 w-1/3 rounded bg-stone-500/[0.2] text-sm",
            pulse && "animate-pulse",
          )}
        >
          &nbsp;
        </p>
      </div>
    </div>
  );
}
