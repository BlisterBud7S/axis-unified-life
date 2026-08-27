import { supabase } from "@/integrations/supabase/client";
import type { DocSpec } from "@/lib/axis-doc";

export type StoredAttachment = { kind: "image" | "file" | "text"; name: string; previewUrl?: string };

export type StoredMedia = {
  id: string;
  kind: "image" | "video";
  status: "processing" | "completed" | "failed";
  url: string | null;
  prompt: string;
  error?: string;
};

export type ConversationRow = {
  id: string;
  title: string;
  model_id: string;
  created_at: string;
  updated_at: string;
};

export type MessageRow = {
  id: string;
  role: string;
  content: string;
  attachments: unknown;
  doc: unknown;
  media: unknown;
  created_at: string;
};

export async function listConversations(): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, title, model_id, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as ConversationRow[];
}

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, role, content, attachments, doc, media, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export async function createConversation(input: { title: string; modelId: string }) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("You need to be signed in.");
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: userId, title: input.title.slice(0, 80) || "New chat", model_id: input.modelId })
    .select("id, title, model_id, created_at, updated_at")
    .single();
  if (error) throw error;
  return data as ConversationRow;
}

export async function renameConversation(id: string, title: string) {
  const { error } = await supabase
    .from("ai_conversations")
    .update({ title: title.slice(0, 80) || "New chat" })
    .eq("id", id);
  if (error) throw error;
}

export async function setConversationModel(id: string, modelId: string) {
  const { error } = await supabase.from("ai_conversations").update({ model_id: modelId }).eq("id", id);
  if (error) throw error;
}

export async function deleteConversation(id: string) {
  const { error: mErr } = await supabase.from("ai_messages").delete().eq("conversation_id", id);
  if (mErr) throw mErr;
  const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
  if (error) throw error;
}

export async function insertMessage(
  conversationId: string,
  message: {
    role: "user" | "assistant";
    content: string;
    attachments?: StoredAttachment[];
    doc?: DocSpec;
    media?: StoredMedia;
  },
) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("You need to be signed in.");
  const { data, error } = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role: message.role,
      content: message.content,
      attachments: (message.attachments ?? []) as never,
      doc: (message.doc ?? null) as never,
      media: (message.media ?? null) as never,
    })
    .select("id, created_at")
    .single();
  if (error) throw error;
  await supabase
    .from("ai_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  return data as { id: string; created_at: string };
}

export async function updateMessage(
  id: string,
  patch: { content?: string; media?: StoredMedia; doc?: DocSpec },
) {
  const payload: Record<string, unknown> = {};
  if (patch.content !== undefined) payload["content"] = patch.content;
  if (patch.media !== undefined) payload["media"] = patch.media;
  if (patch.doc !== undefined) payload["doc"] = patch.doc;
  if (Object.keys(payload).length === 0) return;
  const { error } = await supabase.from("ai_messages").update(payload as never).eq("id", id);
  if (error) throw error;
}

export async function deleteMessage(id: string) {
  const { error } = await supabase.from("ai_messages").delete().eq("id", id);
  if (error) throw error;
}

/** Remove a message and every later message in the same conversation. */
export async function deleteMessagesFrom(conversationId: string, createdAt: string) {
  const { error } = await supabase
    .from("ai_messages")
    .delete()
    .eq("conversation_id", conversationId)
    .gte("created_at", createdAt);
  if (error) throw error;
}
