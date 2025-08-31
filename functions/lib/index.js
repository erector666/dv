"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageUsage = exports.classifyDocument = exports.summarizeDocument = exports.detectLanguage = exports.extractText = exports.translateDocument = exports.getSupportedLanguages = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const node_fetch_1 = __importDefault(require("node-fetch"));
const language_1 = require("@google-cloud/language");
try {
    admin.initializeApp();
}
catch { }
const assertAuthenticated = (context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
};
exports.getSupportedLanguages = (0, https_1.onCall)(async () => {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Missing GOOGLE_TRANSLATE_API_KEY');
    }
    const url = `https://translation.googleapis.com/language/translate/v2/languages?key=${apiKey}&target=en`;
    const resp = await (0, node_fetch_1.default)(url);
    if (!resp.ok) {
        throw new functions.https.HttpsError('internal', `Translate API error: ${resp.status}`);
    }
    const data = (await resp.json());
    const languages = (data.data?.languages || []).map((l) => ({ code: l.language, name: l.name }));
    return { languages };
});
exports.translateDocument = (0, https_1.onCall)(async (request) => {
    const { documentUrl, targetLanguage, sourceLanguage } = request.data;
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Missing GOOGLE_TRANSLATE_API_KEY');
    }
    const docResp = await (0, node_fetch_1.default)(documentUrl);
    if (!docResp.ok) {
        throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
    }
    const text = await docResp.text();
    const body = {
        q: text,
        target: targetLanguage,
        ...(sourceLanguage ? { source: sourceLanguage } : {}),
        format: 'text',
    };
    const resp = await (0, node_fetch_1.default)(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        throw new functions.https.HttpsError('internal', `Translate API error: ${resp.status}`);
    }
    const data = (await resp.json());
    const translatedText = data.data?.translations?.[0]?.translatedText || '';
    return {
        translatedText,
        sourceLanguage: sourceLanguage || data.data?.translations?.[0]?.detectedSourceLanguage || 'en',
        targetLanguage,
        confidence: 0.9,
    };
});
exports.extractText = (0, https_1.onCall)(async (request) => {
    return { text: '' };
});
exports.detectLanguage = (0, https_1.onCall)(async (request) => {
    const { documentUrl } = request.data;
    const client = new language_1.LanguageServiceClient();
    const textResp = await (0, node_fetch_1.default)(documentUrl);
    if (!textResp.ok) {
        throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
    }
    const text = await textResp.text();
    const [result] = await client.analyzeEntities({ document: { content: text, type: 'PLAIN_TEXT' } });
    return { language: result?.language || 'en' };
});
exports.summarizeDocument = (0, https_1.onCall)(async (request) => {
    const { documentUrl, maxLength = 200 } = request.data;
    const textResp = await (0, node_fetch_1.default)(documentUrl);
    if (!textResp.ok) {
        throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
    }
    const text = await textResp.text();
    const summary = text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
    return { summary };
});
exports.classifyDocument = (0, https_1.onCall)(async (request) => {
    const { documentUrl } = request.data;
    const textResp = await (0, node_fetch_1.default)(documentUrl);
    if (!textResp.ok) {
        throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
    }
    const text = (await textResp.text()).toLowerCase();
    const categories = [];
    const tags = [];
    if (text.includes('invoice') || text.includes('receipt')) {
        categories.push('Financial');
        tags.push('invoice', 'payment');
    }
    else if (text.includes('report') || text.includes('analysis')) {
        categories.push('Reports');
        tags.push('report', 'analysis');
    }
    else if (text.includes('contract') || text.includes('agreement')) {
        categories.push('Legal');
        tags.push('contract', 'legal');
    }
    return {
        categories: categories.length ? categories : ['Other'],
        tags,
        summary: text.slice(0, 160),
        language: 'en',
        confidence: 0.7,
    };
});
exports.getStorageUsage = (0, https_2.onRequest)(async (req, res) => {
    const authHeader = req.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const idToken = authHeader.replace('Bearer ', '');
        const decoded = await admin.auth().verifyIdToken(idToken);
        res.json({ data: { totalSize: 0 } });
    }
    catch (e) {
        res.status(401).json({ error: 'Unauthorized' });
    }
});
//# sourceMappingURL=index.js.map