'use strict';

// In firebase-functions v6 the package root is the 2nd-gen (v2) API. The v1
// namespace is the one that exposes functions.firestore.document(...).onCreate.
const functions = require('firebase-functions/v1');
const { Resend } = require('resend');

// Resend's test sender. It can only deliver to the verified email address of
// the Resend account owner, which is exactly the admin-notification case here.
const FROM_ADDRESS = 'TarneemAPP <onboarding@resend.dev>';
const SUBJECT_PREFIX = '[TarneemAPP] ';
const DEFAULT_ADMIN_EMAIL = 'osama.sla@gmail.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatTimestamp(value) {
  if (value === null || value === undefined) return '(missing)';
  try {
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
  } catch (error) {
    // Fall through to the plain string form below.
  }
  return String(value);
}

exports.notifyNewFeedback = functions
  // v1 RuntimeOptions has no `runtime` field, so the Node 20/22 runtime is
  // pinned in firebase.json. `secrets` is required: without declaring it,
  // process.env.RESEND_API_KEY is undefined even after functions:secrets:set.
  // No retry policy: the handler swallows errors, so a retry can only duplicate
  // emails (this trigger must send exactly one per created document).
  .runWith({ secrets: ['RESEND_API_KEY'], failurePolicy: false })
  .firestore.document('feedbacks/{feedbackId}')
  .onCreate(async (snapshot, context) => {
    const documentId = context.params.feedbackId;

    try {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) {
        functions.logger.warn(
          'RESEND_API_KEY is not configured; skipping feedback notification',
          { documentId }
        );
        return;
      }

      const data = snapshot.data() || {};
      const kind = data.kind === 'message' ? 'message' : 'rating';
      const rating = data.rating;
      const category = data.category;
      const comment = data.comment;
      const replyEmail =
        typeof data.replyEmail === 'string' ? data.replyEmail.trim() : '';
      const recipient = process.env.ADMIN_NOTIFY_EMAIL || DEFAULT_ADMIN_EMAIL;

      // The Resend SDK spells the Reply-To header `reply_to`. Only messages
      // carry a (validated) Reply-To; ratings are anonymous and get none.
      const replyTo = kind === 'message' && EMAIL_RE.test(replyEmail)
        ? replyEmail
        : undefined;
      if (kind === 'message' && !replyTo) {
        functions.logger.warn(
          'Invalid or missing replyEmail; sending without Reply-To',
          { documentId }
        );
      }

      const lines = [
        'New feedback for TarneemAPP',
        '',
        `kind: ${kind}`,
        `rating: ${rating === null || rating === undefined ? '(none)' : String(rating)}`,
        `category: ${category || '(none)'}`,
        `comment: ${comment || '(empty)'}`,
      ];
      if (replyEmail) lines.push(`replyEmail: ${replyEmail}`);
      lines.push(
        `createdAt: ${formatTimestamp(data.createdAt)}`,
        `documentId: ${documentId}`
      );

      const subject =
        kind === 'message'
          ? `${SUBJECT_PREFIX}رسالة جديدة`
          : `${SUBJECT_PREFIX}تقييم جديد`;

      const resend = new Resend(apiKey);
      const { data: sent, error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: [recipient],
        subject,
        text: lines.join('\n'),
        ...(replyTo ? { reply_to: replyTo } : {}),
      });

      if (error) {
        functions.logger.error('Resend rejected the feedback notification', {
          documentId,
          kind,
          error,
        });
        return;
      }

      functions.logger.info('Feedback notification sent', {
        documentId,
        kind,
        emailId: sent && sent.id,
      });
    } catch (error) {
      // Never let a notification failure surface as an unhandled rejection.
      functions.logger.error('Failed to send feedback notification', {
        documentId,
        error,
      });
    }
  });
