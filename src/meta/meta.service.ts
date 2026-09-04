import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class MetaService {
  private readonly logger = new Logger(MetaService.name);
  private readonly pixelId: string;
  private readonly accessToken: string;

  constructor(private readonly configService: ConfigService) {
    this.pixelId =
      this.configService.get<string>('META_PIXEL_ID') || '1076512794884771';
    this.accessToken =
      this.configService.get<string>('META_ACCESS_TOKEN') ||
      'EAA9gUPZCjgh4BSVSDtgmmrwzii0ZADQDfKs03S1Rmx0E9lbxFs7q3Eqs6y0WWZA5NCkS102YFtPK6pvk6l6nAG6MgvwRlZAAUZBMH9HZC9nmPjtxROFHZBM8QzF2IbW5I54F4NvaPm3GWosmPZBSATnUOMEZCpRzT4LqBMWMp3u8QAcUJdsf4t3BFclk2WS0sGfewxwZDZD';
  }

  /**
   * SHA256 Hash helper for Meta Privacy Standard
   */
  private hashData(value?: string | null): string | null {
    if (!value) return null;
    const clean = value.trim().toLowerCase();
    if (!clean) return null;
    return crypto.createHash('sha256').update(clean).digest('hex');
  }

  /**
   * Normalize and hash Bangladesh phone number (+8801...)
   */
  private formatAndHashPhone(phone?: string | null): string | null {
    if (!phone) return null;
    let digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('01')) {
      digits = '88' + digits; // Bangladesh standard without leading +
    }
    return crypto.createHash('sha256').update(digits).digest('hex');
  }

  /**
   * Dispatch Server-Side Purchase Conversion to Meta Graph API
   */
  async sendPurchaseEvent(
    order: any,
    clientContext?: {
      clientIp?: string;
      userAgent?: string;
      eventSourceUrl?: string;
    },
  ): Promise<void> {
    if (!this.pixelId || !this.accessToken) {
      this.logger.warn(
        'Meta Pixel ID or Access Token is missing. Skipping Conversions API call.',
      );
      return;
    }

    try {
      const eventTime = Math.floor(Date.now() / 1000);
      const hashedPhone = this.formatAndHashPhone(order.customerPhone);
      const hashedEmail = this.hashData(order.customerEmail);
      const hashedName = this.hashData(order.customerName);

      const payload = {
        data: [
          {
            event_name: 'Purchase',
            event_time: eventTime,
            event_id: `order_${order.id || order.orderNumber}`,
            event_source_url:
              clientContext?.eventSourceUrl ||
              'https://ardhimart.com/checkout',
            action_source: 'website',
            user_data: {
              ...(hashedPhone ? { ph: [hashedPhone] } : {}),
              ...(hashedEmail ? { em: [hashedEmail] } : {}),
              ...(hashedName ? { fn: [hashedName] } : {}),
              ...(clientContext?.clientIp
                ? { client_ip_address: clientContext.clientIp }
                : {}),
              ...(clientContext?.userAgent
                ? { client_user_agent: clientContext.userAgent }
                : {}),
            },
            custom_data: {
              currency: 'BDT',
              value: Number(order.totalAmount || 0),
              content_type: 'product',
              num_items: order.order_items?.length || 1,
              contents: (order.order_items || []).map((item: any) => ({
                id: item.productId,
                quantity: Number(item.quantity || 1),
                item_price: Number(item.price || 0),
              })),
            },
          },
        ],
      };

      const url = `https://graph.facebook.com/v19.0/${this.pixelId}/events?access_token=${this.accessToken}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await res.json();

      if (!res.ok) {
        this.logger.error(
          `Meta CAPI Purchase Event failed: ${JSON.stringify(responseBody)}`,
        );
      } else {
        this.logger.log(
          `[Meta CAPI] Purchase Event successfully sent for Order #${order.orderNumber} (FB events_received: ${responseBody.events_received || 1}, trace: ${responseBody.fbtrace_id})`,
        );
      }
    } catch (error) {
      this.logger.error(
        '[Meta CAPI] Failed to dispatch Conversions API event:',
        error,
      );
    }
  }
}
