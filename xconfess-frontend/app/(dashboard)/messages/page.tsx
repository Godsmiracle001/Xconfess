'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthGuard } from '@/app/components/AuthGuard';
import apiClient from '@/app/lib/api/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Send, User as UserIcon, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Thread {
  confessionId: string;
  senderId: string;
  confessionMessage: string;
  lastMessage: string;
  lastMessageAt: string;
  hasUnread: boolean;
  isAuthor: boolean;
}

interface Message {
  id: number;
  content: string;
  createdAt: string;
  hasReply: boolean;
  replyContent: string | null;
  repliedAt: string | null;
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    try {
      setIsLoadingThreads(true);
      setThreadsError(null);
      const response = await apiClient.get('/messages/threads');
      setThreads(response.data || []);
    } catch (error) {
      console.error('Failed to fetch threads:', error);
      setThreadsError('Unable to load conversations. Check your connection and try again.');
    } finally {
      setIsLoadingThreads(false);
    }
  }, []);

  const fetchMessages = useCallback(async (confessionId: string, senderId: string) => {
    try {
      setIsLoadingMessages(true);
      setMessagesError(null);
      const response = await apiClient.get(`/messages?confession_id=${confessionId}&sender_id=${senderId}`);
      setMessages(response.data?.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      setMessagesError('Unable to load messages for this conversation.');
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread.confessionId, selectedThread.senderId);
    }
  }, [selectedThread, fetchMessages]);

  const handleSendMessage = async () => {
    if (!selectedThread || !newMessage.trim()) return;

    try {
      setIsSending(true);
      if (selectedThread.isAuthor) {
        // Author replies to the last unreplied message in this thread
        const unrepliedMessage = [...messages].reverse().find(m => !m.hasReply);
        if (unrepliedMessage) {
          await apiClient.post('/messages/reply', {
            message_id: unrepliedMessage.id,
            reply: newMessage.trim(),
          });
        } else {
          alert("Please wait for the sender to message you again.");
          return;
        }
      } else {
        // Sender sends a new message to the confession
        await apiClient.post('/messages', {
          confession_id: selectedThread.confessionId,
          content: newMessage.trim(),
        });
      }
      
      setNewMessage('');
      fetchMessages(selectedThread.confessionId, selectedThread.senderId);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {/* Thread List Sidebar */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Messages
            </h1>
          </div>
          <ScrollArea className="flex-1">
            {threadsError ? (
              <div className="p-4 text-sm text-red-600">
                <div className="mb-2">{threadsError}</div>
                <Button variant="ghost" onClick={() => fetchThreads()}>Retry</Button>
              </div>
            ) : isLoadingThreads ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No messages yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {threads.map((thread) => (
                  <button
                    key={`${thread.confessionId}-${thread.senderId}`}
                    onClick={() => setSelectedThread(thread)}
                    className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors flex flex-col gap-1 ${
                      selectedThread?.confessionId === thread.confessionId && selectedThread?.senderId === thread.senderId ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                        {thread.isAuthor ? 'Your Confession' : 'Sent Message'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-1">
                      {thread.confessionMessage}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {thread.lastMessage}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Message View Panel */}
        <div className="flex-1 flex flex-col">
          {selectedThread ? (
            <>
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded-full text-purple-600">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
                      {selectedThread.confessionMessage}
                    </h2>
                    <Badge variant="outline" className="text-[10px] py-0 h-4">
                      {selectedThread.isAuthor ? 'AUTHOR VIEW' : 'SENDER VIEW'}
                    </Badge>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4 bg-gray-50 dark:bg-gray-900">
                {isLoadingMessages ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-2/3" />
                    <Skeleton className="h-10 w-1/2 ml-auto" />
                    <Skeleton className="h-10 w-3/4" />
                  </div>
                ) : messagesError ? (
                  <div className="p-4 text-sm text-red-600">
                    <div className="mb-2">{messagesError}</div>
                    <Button variant="ghost" onClick={() => selectedThread && fetchMessages(selectedThread.confessionId, selectedThread.senderId)}>Retry</Button>
                  </div>
                ) : (
                  <div className="space-y-6 pb-4">
                    {messages.map((msg) => (
                      <div key={msg.id} className="space-y-2">
                        <div className={`flex ${selectedThread.isAuthor ? 'justify-start' : 'justify-end'}`}>
                          <Card className={`max-w-[80%] p-3 ${
                            selectedThread.isAuthor 
                              ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
                              : 'bg-purple-600 text-white border-none'
                          }`}>
                            <p className="text-sm">{msg.content}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <p className={`text-[10px] ${selectedThread.isAuthor ? 'text-gray-400' : 'text-purple-200'}`}>
                                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                              </p>
                              {!selectedThread.isAuthor && msg.hasReply && (
                                <Badge variant="secondary" className="bg-purple-500/50 text-[8px] py-0 h-3 text-white border-none">
                                  Replied
                                </Badge>
                              )}
                            </div>
                          </Card>
                        </div>
                        
                        {msg.hasReply && (
                          <div className={`flex ${selectedThread.isAuthor ? 'justify-end' : 'justify-start'}`}>
                            <Card className={`max-w-[80%] p-3 ${
                              selectedThread.isAuthor 
                                ? 'bg-purple-600 text-white border-none' 
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                            }`}>
                              <p className="text-sm">{msg.replyContent}</p>
                              <p className={`text-[10px] mt-1 ${selectedThread.isAuthor ? 'text-purple-200' : 'text-gray-400'}`}>
                                {msg.repliedAt && formatDistanceToNow(new Date(msg.repliedAt), { addSuffix: true })}
                              </p>
                            </Card>
                          </div>
                        )}
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <div className="text-center py-12 text-gray-400">
                        No messages in this thread yet.
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
                <div className="flex gap-2">
                  <Input
                    placeholder={selectedThread.isAuthor ? "Type a reply..." : "Send another message..."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isSending}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {selectedThread.isAuthor && messages.every(m => m.hasReply) && (
                  <p className="text-[10px] text-gray-400 mt-2 text-center">
                    You have replied to all messages. Wait for the sender to message you again.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
              <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-full mb-4">
                <MessageSquare className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Select a conversation</h3>
              <p className="text-sm max-w-xs text-center">
                Choose a message thread from the list to view the conversation.
              </p>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
