"use client";

import { useRouter } from "next/navigation";
import PostComposer from "@/components/PostComposer";

interface PostComposerWrapperProps {
  userId: string;
  userName?: string | null;
}

export default function PostComposerWrapper({ userId, userName }: PostComposerWrapperProps) {
  const router = useRouter();

  return (
    <PostComposer
      userId={userId}
      userName={userName}
      onPostCreated={() => router.refresh()}
    />
  );
}
