export type ChatChannel = 'counting' | 'shop';
export type ChatStatus = 'open' | 'closed';
export type ChatSender = 'admin' | 'user' | 'visitor';

export type ChatMessageDto = {
  _id: string;
  conversationId: string;
  body: string;
  sender: ChatSender;
  senderUserId?: string;
  createdAt: string;
};

export type ChatConversationDto = {
  _id: string;
  channel: ChatChannel;
  status: ChatStatus;
  userId?: string;
  visitorName?: string;
  visitorPhone?: string;
  storeId?: string;
  brandId?: string;
  subject?: string;
  lastMessageAt: string;
  lastMessagePreview: string;
  unreadForAdmin: number;
  unreadForVisitor: number;
  /** Display title for inbox / header */
  title: string;
  /** Counting user phone / shop phone */
  contactPhone?: string;
  userFullName?: string;
};

export type ChatThreadDto = {
  conversation: ChatConversationDto;
  messages: ChatMessageDto[];
};

export type ChatUnreadDto = {
  unread: number;
};
