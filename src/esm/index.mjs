/**
 * Summary. Google Analytics 4 (Measurement Protocol) for Telegraf
 * @author Paul Braam <paulbraam7@gmail.com> and @zigzag-way
 */

import fetch from 'cross-fetch';

/**
 * @class
 * 
 * @param {Object} options                  Required credentials for GA4
 * @param {String} options.measurement_id   Admin > Data Streams > choose your stream > Measurement ID (Required)
 * @param {String} options.api_secret       Admin > Data Streams > choose your stream > Measurement Protocol > Create
 * @param {String} options.client_id        https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
 */
class TelegrafGA4 {
  constructor({ measurement_id, api_secret, client_id }) {
    if (!measurement_id || !api_secret || !client_id) {
      throw new SyntaxError('GA4 requires measurement_id, api_secret and client_id');
    }
    this.measurement_id = measurement_id;
    this.api_secret = api_secret;
    this.client_id = client_id;
  }

  /** 
   * @method middleware
   * Extends TelegrafContext, e.g.
   * ctx.ga4.event('login', { 
   *    method: 'Telegram' 
   * })
   */
  middleware() {
    return (ctx, next) => {
      ctx.ga4 = this;
      this.user_id = ctx.from.id;
      // set the language automatically
      this.setUserProperties({ language: ctx.from.language_code });
      return next();
    }
  }

  /** 
   * @method _sendView
   * @param {Class} ctx       Telegraf Context
   * @param {String} title    Custom title
   */
  _sendView(ctx, title) {
    const text = ctx.message && ctx.message.text;
    const callbackData = ctx.update.callback_query && ctx.update.callback_query.data;
    const data = text || callbackData;
    if (!(title && typeof title === 'string' || data)) return;
    const page_title = title || data;
    return this.event('page_view', { page_title });
  }

  /** 
   * @method view             Middleware
   * @param {String} title    Custom title
   */
  view(title = null) {
    return (ctx, next) => {
      this._sendView(ctx, title);
      return next();
    }
  }

  /** 
   * @method _handleUserProps
   * @param {Object} user_properties
   * Makes sent user properties validation-ready
   */
  _handleUserProps(user_properties) {
    return Object.entries(user_properties)
      .reduce((acc, [key, value]) => ({ [key]: { value: String(value) }, ...acc}), {});
  }

  /** 
   * @method _createQueryParams
   * @param {Array} events
   * Returns query params for body of the GA POST request
   */
  _createQueryParams(events) {
    const queryParams = {
      client_id: this.client_id,
      events
    };
    if (this.user_id) {
      queryParams.user_id = String(this.user_id);
    }
    if (this.user_properties) {
      queryParams.user_properties = this._handleUserProps(this.user_properties);
    }
    return queryParams;
  }

  /** 
   * @method query
   * @param {Object} param    Body parameters
   * @param {Boolean} debug   Sets debug mode by 'true'
   * Returns query params for body of the GA POST request
   */
  query(params, debug) {
    const debugParam = debug ? 'debug/' : '';
    return fetch(`https://www.google-analytics.com/${debugParam}mp/collect?measurement_id=${this.measurement_id}&api_secret=${this.api_secret}`, {
      method: 'POST',
      body: JSON.stringify(params)
    })
    .then(res => {
      if (debug)
        return res.json().then(({ validationMessages }) => validationMessages);
    });
  }

  /** 
   * @method _validateEvents
   * @param {Array} events   Body parameters
   * Validates events array
   */
  _validateEvents(events) {
    const areValid = events.every(event => {
      return Object.entries(event).every(([key, value]) => {
        const allowedKeys = ['name', 'params'];
        const allowedValueTypes = ['object', 'string'];
        return allowedKeys.includes(key) && allowedValueTypes.includes(typeof value);
      })
    });
    if (!areValid) throw new Error('Passed invalid events');
    return events;
  }

  /** 
   * @method setUserProperties
   * @param {Object} user_properties
   * Extends user properties, e.g. 
   * { subscription: 'free', language: 'en' }
   */
  setUserProperties(user_properties) {
    this.user_properties = this.user_properties
    ? Object.assign(this.user_properties, user_properties)
    : user_properties;
  }

  /** 
   * @method events
   * @param {Array} events    E.g. [{ name: 'login', params: { method: 'Telegram' }}]
   * @param {Boolean} debug   Sets debug mode by 'true'
   * Sends multiple events to GA4
   */
  events(events, debug = false) {
    const validatedEvents = this._validateEvents(events);
    const params = this._createQueryParams(validatedEvents);
    return this.query(params, debug);
  }

  /** 
   * @method events
   * @param {String} name     Event name, e.g 'login' (Required)
   * @param {Object} params   Event params, e.g { method: 'Telegram' } (Optional)
   * @param {Boolean} debug   Sets debug mode by 'true'
   * Sends single event to GA4
   */
  event(name, params, debug = false) {
    const event = { name };
    if (params) {
      event.params = params;
    }
    const queryParams = this._createQueryParams([event]);
    return this.query(queryParams, debug);
  }
}

export default TelegrafGA4;