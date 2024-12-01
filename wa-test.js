const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash"
});

// Prompt dasar untuk Gemini AI
const basePrompt = `
## Tentang
Kamu adalah customer service dari Universitas President yang berlokasi di Jababeka, Cikarang, Jawa Barat, Indonesia bernama PresFriend. 

## Tugas
Tugas kamu adalah menjawab pertanyaan terkait mata kuliah. Kamu hanya menjawab dalam 1 paragraf saja dengan bahasa Indonesia yang sopan dan ramah tanpa emoticon.

## Panggilan
Selalu panggil dengan "Kak"/ "Kakak" / "PresJos" dan hindari memanggil dengan sebutan "Anda". 

## Batasan
Jawab hanya yang kamu tahu saja. Arahkan mereka untuk kontak ke admission@president.ac.id jika terdapat kendala. 

## Rekomendasi
Kamu juga dapat memberikan rekomendasi mata kuliah dari data yang kamu punya jika mereka menanyakan rekomendasi yang diambil. Tanyakan dulu mengenai keinginan profesi dia, dan jumlah maksimal mata kuliah yang bisa diambil. Kemudian cocokkan dengan data yang kamu punya. Rekomendasikan setidaknya 5 mata kuliah.
`;

// Create a new client instance
const client = new Client();

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Client is ready!');
});

// When the client receives QR-Code
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

// Handle incoming messages
client.on('message_create', async (message) => {
    // Keywords yang dikenali
    const keywords = ['tanya,', 'bertanya,', 'bagaimana cara,', 'info,'];
    const matchedKeyword = keywords.find(keyword => message.body.toLowerCase().startsWith(keyword));

    if (matchedKeyword) {
        const userQuery = message.body.substring(matchedKeyword.length).trim(); // Remove matched keyword prefix
        
        const aiPrompt = `
${basePrompt}

## Pertanyaan Pengguna
${userQuery}
        `;

        try {
            const result = await model.generateContent(aiPrompt);
            const responseText = result.response.text();

            // Kirimkan respons kembali ke WhatsApp
            client.sendMessage(message.from, responseText);
        } catch (error) {
            console.error('Error generating AI response:', error);
            client.sendMessage(message.from, "Maaf Kak, sistem sedang mengalami gangguan. Silakan hubungi admission@president.ac.id untuk bantuan lebih lanjut.");
        }
    } else if (message.body.toLowerCase().startsWith('rekomendasi,')) {
        const userQuery = message.body.substring(12).trim(); // Remove "rekomendasi," prefix

        // Example: "profesi entrepreneur, maksimal 3 mata kuliah"
        const [profession, maxCoursesText] = userQuery.split(',');
        const maxCourses = parseInt(maxCoursesText.match(/\d+/)?.[0], 10);

        const aiPrompt = `
${basePrompt}

## Profesi yang Diharapkan
${profession.trim()}

## Jumlah Maksimal Mata Kuliah
${maxCourses || 'Tidak disebutkan'}

## Tugasmu
Berikan rekomendasi minimal 5 mata kuliah sesuai data yang kamu miliki berdasarkan profesi dan jumlah mata kuliah yang disebutkan.
        `;

        try {
            const result = await model.generateContent(aiPrompt);
            const responseText = result.response.text();

            // Kirimkan respons kembali ke WhatsApp
            client.sendMessage(message.from, responseText);
        } catch (error) {
            console.error('Error generating AI response:', error);
            client.sendMessage(message.from, "Maaf Kak, sistem sedang mengalami gangguan. Silakan hubungi admission@president.ac.id untuk bantuan lebih lanjut.");
        }
    } else {
        // Respons default jika pesan tidak dikenali
        client.sendMessage(message.from, "Maaf Kak, pertanyaan tidak dikenali. Silakan gunakan format yang benar seperti 'tanya,' atau 'rekomendasi,' untuk mendapatkan bantuan.");
    }
});

// Start your client
client.initialize();
