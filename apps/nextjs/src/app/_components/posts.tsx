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
        {error && <h6>{error}</h6>}
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
    <div>
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
        <div>
          <h2
            className="text-2xl font-bold text-primary"
            data-testid="editable-post-title"
            role="heading"
            onClick={() => {
              setIsEditMode(true);
            }}
          >
            {title}
          </h2>
          {props.post.created_at && (
            <span className="pr-2">
              created {renderRelativeTime(props.post.created_at)}
            </span>
          )}
          {props.post.updated_at && (
            <span> updated {renderRelativeTime(props.post.updated_at)}</span>
          )}
        </div>
      )}
    </div>
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

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      deletePost.mutate({ id: props.post.id });
    }
  };

  return (
    <div className="flex flex-row rounded-lg bg-muted p-4">
      <div className="flex-grow">
        <EditablePostTitle post={props.post} />
        <p className="mt-2 text-sm">{props.post.content}</p>
      </div>
      <div>
        <Button
          variant="ghost"
          className="cursor-pointer text-sm font-bold uppercase text-primary hover:bg-transparent hover:text-white"
          onClick={handleDelete}
        >
          Delete
        </Button>
      </div>
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

const renderRelativeTime = (dateString?: string): string => {
  if (dateString === undefined) {
    return "A moment ago";
  }

  const now = new Date();
  const from = new Date(dateString);
  const diffInSeconds = Math.round((now.getTime() - from.getTime()) / 1000);

  const units = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "week", seconds: 604800 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ];

  for (const unit of units) {
    const value = Math.floor(diffInSeconds / unit.seconds);
    if (value >= 1) {
      return `${value} ${unit.label}${value > 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
};
