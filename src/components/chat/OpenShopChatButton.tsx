'use client';

import { MessageCircle } from 'lucide-react';
import { ShopButton } from '@/components/shop/ShopUi';

export function OpenShopChatButton({ className }: { className?: string }) {
  return (
    <ShopButton
      className={className}
      onClick={() => {
        window.dispatchEvent(new Event('basar-open-chat'));
      }}
    >
      <MessageCircle className="h-4 w-4" />
      گفتگو آنلاین
    </ShopButton>
  );
}
