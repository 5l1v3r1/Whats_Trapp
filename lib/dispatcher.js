/**
 * @file lib/dispatcher.js
 *
 * Copyright (C) 2018 | Giacomo Trudu aka `Wicker25`
 *
 * This file is part of WhatsTrapp.
 *
 * WhatsTrapp is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * WhatsTrapp is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with WhatsTrapp. If not, see <https://www.gnu.org/licenses/>.
 */

const EventEmitter = require('events');
const WebSocket = require('ws');

/**
 * The Message Dispatcher used by the Puppeteer.
 */
class Dispatcher extends EventEmitter {
    constructor(...options) {
        super();

        this.server = new WebSocket.Server(...options);

        this.server.on('connection', async (client, request) => {
            this._handleConnection(client, request);
        });
    }

    _handleConnection(client, request) {
        client.remoteAddress = request.connection.remoteAddress;

        client
            .on('message', async (data) => {
                this._handleMessage(client, data);
            })
            .on('disconnect', async () => {
                this.emit('disconnect', client);
            })
        ;

        this.emit('connection', client, request);
    }

    _handleMessage(client, data) {
        const message = JSON.parse(data);

        switch (message.type) {
            case 'start_session':
            case 'stop_session':
            case 'store_data':
            case 'debug': {
                this.emit(message.type, client, message.body);
                break;
            }

            case 'auth_challenge':
            case 'auth_completed': {
                this._forwardMessage(message);
                break;
            }

            default: {
                throw 'Unknown message type';
            }
        }
    }

    _forwardMessage(message) {
        const { puppetId, type, body } = message;

        const clients = Array.from(this.server.clients);

        const targetClient = clients.find((client) => {
            return client.puppetId === puppetId && client.readyState === WebSocket.OPEN;
        });

        if (!targetClient) {
            throw 'Unable to find the target client';
        }

        targetClient.send(
            JSON.stringify({ type, body })
        )
    }
}

module.exports = Dispatcher;
