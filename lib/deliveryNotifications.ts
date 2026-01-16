/**
 * DELIVERY-FIRST NOTIFICATION SYSTEM
 * 
 * Sends notifications when new assignments are delivered to buyers.
 * Success = fewer logins, not more.
 */

import type { LossEvent } from './database.types';

export interface DeliveryNotification {
  buyerId: string;
  buyerEmail: string;
  buyerPhone?: string;
  assignments: LossEvent[];
  deliveryMethod: 'email' | 'sms' | 'webhook';
}

/**
 * Send email notification for new assignments
 */
export async function sendEmailNotification(notification: DeliveryNotification): Promise<boolean> {
  try {
    console.log('[DELIVERY] Email notification triggered for:', notification.buyerEmail);
    console.log('[DELIVERY] Assignment count:', notification.assignments.length);
    
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    // const response = await emailService.send({
    //   to: notification.buyerEmail,
    //   subject: `${notification.assignments.length} New Loss Assignment${notification.assignments.length !== 1 ? 's' : ''}`,
    //   template: 'new-assignments',
    //   data: {
    //     assignments: notification.assignments.map(a => ({
    //       address: a.zip, // Replace with actual address when available
    //       lossType: a.event_type,
    //       timestamp: a.event_timestamp
    //     }))
    //   }
    // });
    
    console.log('[DELIVERY] Email notification queued (stub)');
    return true;
  } catch (error) {
    console.error('[DELIVERY] Email notification failed:', error);
    return false;
  }
}

/**
 * Send SMS notification for new assignments
 */
export async function sendSMSNotification(notification: DeliveryNotification): Promise<boolean> {
  if (!notification.buyerPhone) {
    console.warn('[DELIVERY] SMS notification skipped - no phone number');
    return false;
  }
  
  try {
    console.log('[DELIVERY] SMS notification triggered for:', notification.buyerPhone);
    console.log('[DELIVERY] Assignment count:', notification.assignments.length);
    
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    // const response = await smsService.send({
    //   to: notification.buyerPhone,
    //   message: `You have ${notification.assignments.length} new loss assignment${notification.assignments.length !== 1 ? 's' : ''} in your territory. Login to view details.`
    // });
    
    console.log('[DELIVERY] SMS notification queued (stub)');
    return true;
  } catch (error) {
    console.error('[DELIVERY] SMS notification failed:', error);
    return false;
  }
}

/**
 * Send webhook notification for new assignments
 */
export async function sendWebhookNotification(notification: DeliveryNotification): Promise<boolean> {
  try {
    console.log('[DELIVERY] Webhook notification triggered for buyer:', notification.buyerId);
    console.log('[DELIVERY] Assignment count:', notification.assignments.length);
    
    // TODO: Integrate with webhook service
    // const response = await fetch(buyerWebhookUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     buyerId: notification.buyerId,
    //     assignmentCount: notification.assignments.length,
    //     assignments: notification.assignments
    //   })
    // });
    
    console.log('[DELIVERY] Webhook notification sent (stub)');
    return true;
  } catch (error) {
    console.error('[DELIVERY] Webhook notification failed:', error);
    return false;
  }
}

/**
 * Deliver assignments to buyer with notifications
 */
export async function deliverAssignments(
  buyerId: string,
  buyerEmail: string,
  assignments: LossEvent[],
  options: {
    sendEmail?: boolean;
    sendSMS?: boolean;
    sendWebhook?: boolean;
    buyerPhone?: string;
  } = {}
): Promise<{ success: boolean; notifications: string[] }> {
  const notifications: string[] = [];
  
  console.log('[DELIVERY] Starting delivery for buyer:', buyerEmail);
  console.log('[DELIVERY] Assignments to deliver:', assignments.length);
  
  const notification: DeliveryNotification = {
    buyerId,
    buyerEmail,
    buyerPhone: options.buyerPhone,
    assignments,
    deliveryMethod: 'email' // Default
  };
  
  // Send email (default, always enabled)
  if (options.sendEmail !== false) {
    const emailSent = await sendEmailNotification(notification);
    if (emailSent) {
      notifications.push('email');
    }
  }
  
  // Send SMS (optional)
  if (options.sendSMS && options.buyerPhone) {
    const smsSent = await sendSMSNotification(notification);
    if (smsSent) {
      notifications.push('sms');
    }
  }
  
  // Send webhook (optional)
  if (options.sendWebhook) {
    const webhookSent = await sendWebhookNotification(notification);
    if (webhookSent) {
      notifications.push('webhook');
    }
  }
  
  console.log('[DELIVERY] Delivery complete. Notifications sent:', notifications.join(', '));
  
  return {
    success: notifications.length > 0,
    notifications
  };
}

/**
 * Log delivery for audit trail
 */
export async function logDelivery(
  buyerId: string,
  assignmentIds: string[],
  notificationMethods: string[]
): Promise<void> {
  console.log('[DELIVERY] Logging delivery to audit trail');
  console.log('[DELIVERY] Buyer:', buyerId);
  console.log('[DELIVERY] Assignments:', assignmentIds.length);
  console.log('[DELIVERY] Methods:', notificationMethods.join(', '));
  
  // TODO: Store in delivery_logs table
  // await supabase.from('delivery_logs').insert({
  //   buyer_id: buyerId,
  //   assignment_ids: assignmentIds,
  //   notification_methods: notificationMethods,
  //   delivered_at: new Date().toISOString()
  // });
}
