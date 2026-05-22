
import { GoogleGenAI, Chat, Type } from "@google/genai";
import type { SatisfactionAnalytics, SalesHistoryData, SupplierPerformanceData, Sale, Product, SuggestedOffer } from '../types';
import { FAQ_DATA } from '../faqData';

export const API_KEY_STORAGE_KEY = 'gemini_api_key';

// FIX: Strictly follow guidelines for API key retrieval from process.env.API_KEY
export const getApiKey = (): string | null => {
    if (typeof process !== 'undefined' && process.env.API_KEY) {
        return process.env.API_KEY;
    }
    return null;
}

const getAi = (): GoogleGenAI | null => {
    const apiKey = getApiKey();
    if (!apiKey) {
        return null;
    }
    return new GoogleGenAI({ apiKey });
}

const disabledFeatureMessage = "ميزة الذكاء الاصطناعي معطلة حالياً.";

export const generateProductDescription = async (productName: string, category: string): Promise<string> => {
  const ai = getAi();
  if (!ai) {
    return disabledFeatureMessage;
  }

  try {
    const prompt = `اكتب وصفًا تسويقيًا جذابًا وقصيرًا (جملتين أو ثلاث) لمنتج اسمه "${productName}" في فئة "${category}". يجب أن يكون الوصف باللغة العربية.`;
    
    // FIX: Updated prohibited model name to gemini-3-flash-preview
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
    });
    
    return response.text || "";
  } catch (error) {
    console.error("Error generating description with Gemini:", error);
    return "عذراً، حدث خطأ أثناء إنشاء الوصف.";
  }
};

export const suggestSellPrice = async (productName: string, category: string, costPrice: number): Promise<number | null> => {
    const ai = getAi();
    if (!ai) {
        return null;
    }

    try {
        const prompt = `لدي منتج اسمه "${productName}" في فئة "${category}" وتكلفته ${costPrice}. اقترح سعر بيع تنافسي مع هامش ربح معقول لهذه الفئة. أرجع الرقم فقط بدون أي نص إضافي أو رموز عملة.`;

        // FIX: Updated prohibited model name to gemini-3-flash-preview
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        
        const priceText = response.text?.trim() || "";
        const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));

        return isNaN(price) ? null : Math.ceil(price / 5) * 5; // Round to nearest 5
    } catch (error) {
        console.error("Error suggesting price with Gemini:", error);
        return null;
    }
};


export const analyzeSatisfaction = async (data: SatisfactionAnalytics): Promise<string> => {
    const ai = getAi();
    if (!ai || !data || (data.happy + data.neutral + data.unhappy) === 0) {
        return "لا توجد بيانات كافية للتحليل.";
    }

    try {
        const prompt = `
        أنا مدير متجر وأريد تحليل بيانات رضا العملاء. البيانات هي كالتالي:
        - إجمالي التقييمات: ${data.happy + data.neutral + data.unhappy}
        - عملاء سعداء: ${data.happy}
        - عملاء محايدون: ${data.neutral}
        - عملاء غير سعداء: ${data.unhappy}

        بناءً على هذه الأرقام، قدم لي تحليلًا موجزًا (جملتين) واقتراحًا واحدًا عمليًا يمكنني تنفيذه لتحسين رضا العملاء. يجب أن تكون الإجابة باللغة العربية.
        `;
        
        // FIX: Updated prohibited model name to gemini-3-flash-preview
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        return response.text || "";
    } catch (error) {
        console.error("Error analyzing satisfaction with Gemini:", error);
        return "عذراً، حدث خطأ أثناء تحليل البيانات.";
    }
};

export const generateSalesForecastAndInsights = async (salesHistory: SalesHistoryData[]): Promise<{ forecast: string, insights: string }> => {
    const ai = getAi();
    if (!ai || salesHistory.length < 5) {
        return { forecast: "لا توجد بيانات مبيعات كافية لإنشاء توقعات دقيقة.", insights: "سجل المزيد من المبيعات للحصول على تحليلات حول أفضل أوقات العروض." };
    }

    try {
        const historyString = salesHistory.map(s => `${s.date}: ${s.totalSales.toFixed(2)}`).join('\n');
        
        const prompt = `
        أنا مدير متجر وهذه بيانات مبيعاتي اليومية خلال الفترة الماضية:
        ${historyString}

        مهمتك من جزأين:
        1.  **توقع المبيعات**: بناءً على هذه البيانات، قدم توقعًا موجزًا للمبيعات في الفترة القادمة (مثلاً: الشهر القادم). صف الاتجاه العام (نمو، استقرار، انخفاض) وقدم تقديرًا رقميًا تقريبيًا إن أمكن.
        2.  **نصيحة للعروض**: بناءً على الأنماط في تواريخ المبيعات (مثل أيام الأسبوع أو أوقات معينة في الشهر)، ما هو أفضل وقت لعمل عروض ترويجية لزيادة المبيعات؟ قدم نصيحة واحدة قابلة للتنفيذ.

        افصل بين الإجابتين بفاصل "|||". يجب أن تكون الإجابة باللغة العربية.
        مثال للتنسيق: "نتوقع زيادة في المبيعات... ||| أفضل وقت للعروض هو نهاية الأسبوع حيث..."
        `;

        // FIX: Updated prohibited model name to gemini-3-flash-preview
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });

        const [forecast, insights] = (response.text || "").split('|||');
        return {
            forecast: forecast?.trim() || "لم نتمكن من إنشاء توقع.",
            insights: insights?.trim() || "لم نتمكن من استنتاج نصيحة."
        };

    } catch (error) {
        console.error("Error with Gemini sales forecast:", error);
        return { forecast: "عذراً، حدث خطأ أثناء تحليل المبيعات.", insights: "فشل استنتاج النصائح." };
    }
};


export const analyzeSuppliers = async (performanceData: SupplierPerformanceData[]): Promise<string> => {
    const ai = getAi();
    if (!ai || performanceData.length === 0) {
        return "لا توجد بيانات كافية لتحليل أداء الموردين.";
    }

    try {
        const dataString = performanceData
            .map(s => `المورد: ${s.supplierName}, إجمالي قيمة المشتريات: ${s.totalPurchaseValue.toFixed(2)}, عدد الطلبات: ${s.purchaseCount}, نسبة المرتجعات: ${s.returnRate.toFixed(2)}%`)
            .join('\n');
            
        const prompt = `
        أنا مدير متجر وهذه بيانات أداء الموردين لدي:
        ${dataString}

        بناءً على هذه البيانات، قم بتحليلها ورشح لي أفضل مورد للتعامل معه في الفترة القادمة. اذكر اسم المورد بوضوح وقدم سببًا موجزًا (جملة واحدة) لترشيحك بناءً على عوامل مثل حجم التعامل، الثقة (نسبة مرتجعات منخفضة)، أو أي عامل آخر تراه مهمًا. يجب أن تكون الإجابة باللغة العربية.
        `;

        // FIX: Updated prohibited model name to gemini-3-flash-preview
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        
        return response.text || "";
    } catch (error) {
        console.error("Error with Gemini supplier analysis:", error);
        return "عذراً، حدث خطأ أثناء تحليل بيانات الموردين.";
    }
};

export const suggestCustomerOffer = async (customerName: string, purchaseHistory: Sale[]): Promise<SuggestedOffer | null> => {
    const ai = getAi();
    if (!ai || purchaseHistory.length === 0) {
        return null;
    }

    try {
        const historySummary = purchaseHistory.flatMap(sale => sale.items.map(item => item.name)).join(', ');
        
        const prompt = `
        عميل اسمه "${customerName}" لديه سجل المشتريات التالي (قائمة بأسماء المنتجات التي اشتراها):
        ${historySummary}

        بناءً على المنتجات التي يشتريها، اقترح نسبة خصم مئوية (كرقم فقط) لتشجيعه على عملية شراء جديدة، وقدم سببًا موجزًا (جملة واحدة) لهذا الخصم.
        أرجع الإجابة بتنسيق JSON صالح يحتوي على مفتاحين: "discount" (كنسبة مئوية رقمية مثل 10 أو 15) و "reason" (كنص باللغة العربية).
        `;

        // FIX: Updated prohibited model name to gemini-3-flash-preview
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
             config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        discount: { type: Type.NUMBER },
                        reason: { type: Type.STRING },
                    },
                    required: ["discount", "reason"],
                },
            },
        });
        
        const jsonResponse = JSON.parse(response.text || "{}");
        if (jsonResponse && typeof jsonResponse.discount === 'number' && typeof jsonResponse.reason === 'string') {
            return jsonResponse as SuggestedOffer;
        }
        return null;
    } catch (error) {
        console.error("Error with Gemini customer offer suggestion:", error);
        return null;
    }
};

export const suggestFreebieGift = async (customerName: string, purchaseHistory: Sale[], availableProducts: Product[]): Promise<string> => {
    const ai = getAi();
    if (!ai) {
        return "لا يمكن إنشاء اقتراح حاليًا.";
    }

    try {
        const historySummary = purchaseHistory
            .flatMap(sale => sale.items)
            .map(item => availableProducts.find(p => p.id === item.id)?.category)
            .filter(Boolean)
            .join(', ');
        const productList = availableProducts.filter(p => p.stock > 0).map(p => `${p.name} (السعر: ${p.sellPrice})`).join('\n');

        const prompt = `
        عميل اسمه "${customerName}" مؤهل للحصول على هدية. هذا العميل يشتري بكثرة من الفئات التالية: ${historySummary}.
        
        اقترح منتجًا واحدًا كهدية من قائمة المنتجات المتاحة التالية. اختر شيئًا مكملاً لمشترياته ويفضل أن يكون منخفض التكلفة.
        
        المنتجات المتاحة:
        ${productList}

        اذكر اسم المنتج المقترح فقط بدون أي نص إضافي.
        `;

        // FIX: Updated prohibited model name to gemini-3-flash-preview
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        
        return (response.text || "").trim();
    } catch (error) {
        console.error("Error with Gemini freebie suggestion:", error);
        return "عذراً، حدث خطأ أثناء إنشاء الاقتراح.";
    }
};

export const generateFollowUpMessage = async (customerName: string, lastPurchaseDate: string): Promise<string> => {
    const ai = getAi();
    if (!ai) {
        return "لا يمكن إنشاء رسالة حاليًا.";
    }

    try {
        const prompt = `
        أنا مدير متجر. عميل اسمه "${customerName}" لم يقم بالشراء منذ تاريخ ${new Date(lastPurchaseDate).toLocaleDateString('ar-EG')}.
        
        اكتب رسالة قصيرة وودودة (سطرين كحد أقصى) يمكن إرسالها عبر الواتساب لتذكيره بالمتجر وتشجيعه على العودة، ربما مع تلميح بوجود منتجات جديدة. يجب أن تكون الرسالة باللغة العربية وبأسلوب غير رسمي وجذاب.
        `;
        // FIX: Updated prohibited model name to gemini-3-flash-preview
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || "";
    } catch (error) {
        console.error("Error with Gemini follow-up message generation:", error);
        return "عذراً، حدث خطأ أثناء إنشاء الرسالة.";
    }
};

export const generateClearanceOffer = async (productName: string, stock: number, daysSinceLastSale: number): Promise<string> => {
    const ai = getAi();
    if (!ai) {
        return "لا يمكن إنشاء عرض حاليًا.";
    }

    try {
        const prompt = `
        لدي منتج راكد اسمه "${productName}" لم يتم بيعه منذ ${daysSinceLastSale} يومًا، والكمية المتبقية في المخزون هي ${stock} قطعة.

        مهمتك: اكتب عرضًا ترويجيًا قصيرًا وجذابًا (سطرين كحد أقصى) لتصفية هذا المخزون. يمكن أن يكون العرض خصمًا مئويًا، أو عرض "اشتر واحدًا واحصل على الثاني"، أو أي فكرة إبداعية أخرى. يجب أن تكون الرسالة باللغة العربية.
        `;
        // FIX: Updated prohibited model name to gemini-3-flash-preview
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return (response.text || "").trim();
    } catch (error) {
        console.error("Error with Gemini clearance offer generation:", error);
        return "عذراً، حدث خطأ أثناء إنشاء العرض.";
    }
};

let salesChat: Chat | null = null;
let supportChat: Chat | null = null;

export const initSalesChatbot = async (products: Product[]): Promise<void> => {
    const ai = getAi();
    if (!ai) {
        console.log("Sales chatbot disabled due to missing API key.");
        salesChat = null;
        return;
    }

    const productInfo = products.map(p => `- ${p.name}: السعر ${p.sellPrice}, الكمية المتاحة ${p.stock}`).join('\n');
    
    // FIX: Updated prohibited model name to gemini-3-flash-preview
    salesChat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `أنت مساعد ذكي في نظام نقاط بيع داخلي. مهمتك هي الإجابة على استفسارات المستخدم حول المنتجات فقط. استخدم البيانات التالية للإجابة. كن موجزًا ومباشرًا. إذا سُئلت عن شيء خارج نطاق المنتجات، أجب بـ "أنا متخصص في الإجابة عن المنتجات فقط."
        
        بيانات المنتجات المتاحة:
        ${productInfo}
        `,
      },
    });
};

export const sendChatMessage = async (message: string): Promise<string> => {
    if (!salesChat) {
         return "عذرًا، الشات بوت غير مفعل حاليًا.";
    }
    
    try {
        const response = await salesChat.sendMessage({ message });
        return response.text || "";
    } catch (error) {
        console.error("Error sending chat message:", error);
        return "عذرًا، حدث خطأ أثناء التواصل مع المساعد الذكي.";
    }
};

export const initSupportChatbot = async (): Promise<void> => {
    const ai = getAi();
    if (!ai) {
        console.log("Support chatbot disabled due to missing API key.");
        supportChat = null;
        return;
    }
    
    const faqString = FAQ_DATA.map(item => `سؤال: ${item.question}\nجواب: ${item.answer}`).join('\n\n');
    
    // FIX: Updated prohibited model name to gemini-3-flash-preview
    supportChat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `أنت مساعد دعم فني ذكي لبرنامج نقاط بيع اسمه "تكنو باور". مهمتك هي الإجابة على أسئلة المستخدمين حول كيفية استخدام البرنامج بناءً على قاعدة المعرفة التالية. كن ودودًا ومساعدًا. إذا كان السؤال خارج نطاق قاعدة المعرفة، أجب بـ "ليس لدي معلومات عن هذا الموضوع. لمزيد من المساعدة، يمكنك التواصل مع الدعم الفني المباشر عبر البريد الإلكتروني: support@technopower.eg أو عبر واتساب: +201020246503."

        قاعدة المعرفة (الأسئلة الشائعة):
        ${faqString}
        `,
      },
    });
};

export const analyzeFinancialReport = async (report: FinancialReport, period: string): Promise<string> => {
    const ai = getAi();
    if (!ai) return "ميزة الذكاء الاصطناعي معطلة.";

    try {
        const topProducts = report.productProfits.slice(0, 3).map(p => p.name).join('، ');
        const prompt = `
        أنا مدير متجر وهذا ملخص مالي للفترة (${period}):
        - إجمالي الإيرادات: ${report.totalRevenue}
        - إجمالي الربح: ${report.netProfit}
        - المنتجات الأكثر ربحية: ${topProducts}
        - إجمالي المصاريف: ${report.totalExpenses}

        بناءً على هذه الأرقام، قدم لي تحليلًا ذكيًا وموجزًا (3 جمل) حول أداء المتجر. هل هناك زيادة أو انخفاض؟ هل الأداء العام جيد؟ وجه لي نصيحة واحدة لتحسين الأداء. اجعل الرد باللغة العربية بأسلوب احترافي جداً.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || "لم نتمكن من إنشاء تحليل.";
    } catch (error) {
        console.error("Error analyzing financials:", error);
        return "حدث خطأ أثناء تحليل البيانات المالية.";
    }
};

