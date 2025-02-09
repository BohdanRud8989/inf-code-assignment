import { PropsWithChildren } from "react";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest.next.utils";

import { api } from "~/trpc/react";
import { CreatePostForm, EditablePostTitle, PostCard } from "../posts";

// Mocked to prevent creating new Posts in real DB(to not show them on UI then)
vi.mock("~/trpc/react", () => {
  return {
    TRPCReactProvider: ({ children }: PropsWithChildren) => (
      <div>{children}</div>
    ),
    api: {
      useUtils: () => ({
        post: {
          invalidate: vi.fn().mockResolvedValue(undefined),
        },
      }),
      post: {
        create: {
          useMutation: vi.fn(({ onSuccess }) => ({
            mutate: vi.fn(() => {
              onSuccess();
            }),
          })),
        },
        update: {
          useMutation: vi.fn().mockReturnValue({
            mutate: vi.fn(),
          }),
        },
        delete: {
          useMutation: vi.fn(),
        },
        all: {
          useQuery: vi.fn().mockReturnValue({ data: [], isFetching: false }),
        },
      },
    },
  };
});
vi.spyOn(window, "confirm").mockReturnValue(true);

const minutesSincePostCreation = 5;
const minutesSincePostUpdated = 3;
const mockedPost = Object.freeze({
  title: "Old Title",
  content: "Sample Content",
  id: "123",
  created_at: new Date(
    new Date().getTime() - (60 + minutesSincePostCreation) * 60 * 1000,
  ).toISOString(),
  updated_at: new Date(
    new Date().getTime() - (60 + minutesSincePostUpdated) * 60 * 1000,
  ).toISOString(),
});
const newTitle = "New Title";

const getTitleElement = (name: string) => screen.getByRole("heading", { name });

const getButtonElement = (copy: string) => {
  const regex = new RegExp(copy, "i");
  return screen.getByRole("button", { name: regex });
};

describe("CreatePostForm Component", () => {
  test("should render the form correctly", async () => {
    render(<CreatePostForm />);
    expect(screen.getByTestId("post-form")).toBeDefined();
  });

  test("should have title and content input fields", async () => {
    render(<CreatePostForm />);

    const titleInput = screen.getByPlaceholderText("Title");
    const contentInput = screen.getByPlaceholderText("Content");

    expect(titleInput).toBeDefined();
    expect(contentInput).toBeDefined();
  });

  test("should allow user to type in input fields", async () => {
    render(<CreatePostForm />);

    const titleInput = screen.getByPlaceholderText("Title");
    const contentInput = screen.getByPlaceholderText("Content");

    fireEvent.change(titleInput, { target: { value: "Test Title" } });
    fireEvent.change(contentInput, { target: { value: "Test Content" } });

    expect(titleInput.value).toBe("Test Title");
    expect(contentInput.value).toBe("Test Content");
  });

  test("should submit the form when clicking the Create button", async () => {
    render(<CreatePostForm />);

    const titleInput = screen.getByPlaceholderText("Title");
    const contentInput = screen.getByPlaceholderText("Content");
    const createButton = getButtonElement("create");

    fireEvent.change(titleInput, { target: { value: "Sample Post" } });
    fireEvent.change(contentInput, { target: { value: "Sample Content" } });

    await act(async () => {
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(titleInput.value).toBe("");
      expect(contentInput.value).toBe("");
    });
  });

  test("should display an error message and highlight fields if no title and content are set", async () => {
    render(<CreatePostForm />);

    const createButton = getButtonElement("create");
    fireEvent.click(createButton);

    await waitFor(() => {
      const errorMessage = screen.getByText("Title and content are required");
      expect(errorMessage).toBeDefined();
    });
  });
});

describe("PostCard Component", () => {
  test("should confirm deletion before removing a post", async () => {
    const deleteMutateMock = vi.fn();
    vi.mocked(api.post.delete.useMutation).mockReturnValue({
      mutate: deleteMutateMock,
    });

    render(<PostCard post={mockedPost} />);

    const deleteButton = getButtonElement("delete");
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(deleteMutateMock).toHaveBeenCalledWith({ id: mockedPost.id });
  });
});

describe("EditablePostTitle Component", () => {
  let updateMutateMock;

  beforeEach(() => {
    updateMutateMock = vi.fn();
    vi.mocked(api.post.update.useMutation).mockReturnValue({
      mutate: updateMutateMock,
    });
  });

  test("should enter edit mode when clicking on the title", async () => {
    render(<EditablePostTitle post={mockedPost} />);

    const titleElement = getTitleElement(mockedPost.title);

    fireEvent.click(titleElement);

    expect(
      screen.queryByRole("heading", { name: mockedPost.title }),
    ).toBeNull();
    expect(screen.getByRole("textbox")).toBeDefined();
    expect(getButtonElement("create")).toBeDefined();
    expect(getButtonElement("cancel")).toBeDefined();
  });

  test("should update the title on save", async () => {
    render(<EditablePostTitle post={mockedPost} />);

    fireEvent.click(getTitleElement(mockedPost.title));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: newTitle } });

    await act(async () => {
      const createButton = getButtonElement("create");
      fireEvent.click(createButton);
    });

    expect(getTitleElement(newTitle)).toBeDefined();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(updateMutateMock).toHaveBeenCalledWith({
      ...mockedPost,
      title: newTitle,
    });
  });

  test("should cancel edit mode on escape key", async () => {
    render(<EditablePostTitle post={mockedPost} />);

    fireEvent.click(getTitleElement(mockedPost.title));

    expect(screen.getByRole("textbox")).toBeDefined();
    expect(
      screen.queryByRole("heading", { name: mockedPost.title }),
    ).toBeNull();

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    });

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(getTitleElement(mockedPost.title)).toBeDefined();
  });

  test("should save edit mode on enter key", async () => {
    render(<EditablePostTitle post={mockedPost} />);

    fireEvent.click(getTitleElement(mockedPost.title));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: newTitle },
    });

    await act(async () => {
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    });

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(getTitleElement(newTitle)).toBeDefined();
    expect(updateMutateMock).toHaveBeenCalledWith({
      ...mockedPost,
      title: newTitle,
    });
  });

  test("should reset the title on cancel", async () => {
    render(<EditablePostTitle post={mockedPost} />);

    fireEvent.click(getTitleElement(mockedPost.title));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Modified" },
    });

    await act(async () => {
      const cancelButton = getButtonElement("cancel");
      fireEvent.click(cancelButton);
    });

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(getTitleElement(mockedPost.title)).toBeDefined();
  });

  test("should display created date as relative time", async () => {
    const regex = new RegExp(`${minutesSincePostCreation} minutes ago`, "i");

    render(<EditablePostTitle post={mockedPost} />);

    expect(screen.getByText(regex)).toBeDefined();
  });

  test("should display updated date as relative time", async () => {
    const regex = new RegExp(`${minutesSincePostUpdated} minutes ago`, "i");

    render(<EditablePostTitle post={mockedPost} />);

    expect(screen.getByText(regex)).toBeDefined();
  });
});
