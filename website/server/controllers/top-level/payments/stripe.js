import shared from '../../../../common';
import {
  authWithHeaders,
} from '../../../middlewares/auth';
import stripePayments from '../../../libs/payments/stripe';

const api = {};

/**
 * @apiIgnore Payments are considered part of the private API
 * @api {post} /stripe/checkout-session Create a Stripe Checkout Session
 * @apiName StripeCheckout
 * @apiGroup Payments
 *
 * @apiParam (Body) {String} gemsBlock If purchasing a gem block, its key
 * @apiParam (Body) {Object} gift The gift object
 * @apiParam (Body) {String} sub If purchasing a subscription, its key
 * @apiParam (Body) {UUID} groupId If purchasing a group plan, the group id
 * @apiParam (Body) {String} [coupon] Subscription Coupon
 *
 * @apiSuccess {String} data.sessionId The created checkout session id
 * */
api.createCheckoutSession = {
  method: 'POST',
  url: '/stripe/checkout-session',
  middlewares: [authWithHeaders()],
  async handler (req, res) {
    const { user } = res.locals;
    const {
      gift, sub: subKey, gemsBlock, coupon, groupId,
    } = req.body;

    const sub = subKey ? shared.content.subscriptionBlocks[subKey] : false;

    const session = await stripePayments.createCheckoutSession({
      user, gemsBlock, gift, sub, groupId, coupon, headers: req.headers,
    });

    res.respond(200, {
      sessionId: session.id,
    });
  },
};

/**
 * @apiIgnore Payments are considered part of the private API
 * @api {post} /stripe/checkout Stripe checkout
 * @apiName StripeCheckout
 * @apiGroup Payments
 *
 * @apiParam {String} id Body parameter - The token
 * @apiParam {String} email Body parameter - the customer email
 * @apiParam {String} gift Query parameter - stringified json object, gift
 * @apiParam {String} sub Query parameter - subscription, possible values are:
 *                        basic_earned, basic_3mo, basic_6mo, google_6mo, basic_12mo
 * @apiParam {String} coupon Query parameter - coupon for the matching subscription,
 *                           required only for certain subscriptions
 *
 * @apiSuccess {Object} data Empty object
 * */
api.checkout = { //TODO
  method: 'POST',
  url: '/stripe/checkout',
  middlewares: [authWithHeaders()],
  async handler (req, res) {
    // @TODO: These quer params need to be changed to body
    const token = req.body.id;
    const { user } = res.locals;
    const gift = req.query.gift ? JSON.parse(req.query.gift) : undefined;
    const sub = req.query.sub ? shared.content.subscriptionBlocks[req.query.sub] : false;
    const { groupId, coupon, gemsBlock } = req.query;

    await stripePayments.checkout({
      token, user, gemsBlock, gift, sub, groupId, coupon, headers: req.headers,
    });

    res.respond(200, {});
  },
};

/**
 * @apiIgnore Payments are considered part of the private API
 * @api {post} /stripe/subscribe/edit Edit Stripe subscription
 * @apiName StripeSubscribeEdit
 * @apiGroup Payments
 *
 * @apiParam {String} id Body parameter - The token
 *
 * @apiSuccess {Object} data Empty object
 * */
api.subscribeEdit = { //TODO
  method: 'POST',
  url: '/stripe/subscribe/edit',
  middlewares: [authWithHeaders()],
  async handler (req, res) {
    const { groupId } = req.body;
    const { user } = res.locals;

    const session = await stripePayments.createEditCardCheckoutSession({ groupId, user });

    res.respond(200, {
      sessionId: session.id,
    });
  },
};

/**
 * @apiIgnore Payments are considered part of the private API
 * @api {get} /stripe/subscribe/cancel Cancel Stripe subscription
 * @apiName StripeSubscribeCancel
 * @apiGroup Payments
 * */
api.subscribeCancel = { //TODO
  method: 'GET',
  url: '/stripe/subscribe/cancel',
  middlewares: [authWithHeaders()],
  async handler (req, res) {
    const { user } = res.locals;
    const { groupId } = req.query;

    await stripePayments.cancelSubscription({ user, groupId });

    if (req.query.noRedirect) {
      res.respond(200);
    } else {
      res.redirect('/');
    }
  },
};

api.handleWebhooks = {
  method: 'POST',
  url: '/stripe/webhooks',
  async handler (req, res) {
    await stripePayments.handleWebhooks({ body: req.body, headers: req.headers });

    return res.respond(200, {});
  },
};

export default api;
