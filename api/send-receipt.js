const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    try {
        const serviceAccount = require('../service-account-key.json.json');
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (error) {
        console.error('Firebase Admin initialization error:', error);
    }
}

const db = admin.firestore();

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { email, bookingId, bookingData } = req.body;

        if (!email || !bookingId || !bookingData) {
            return res.status(400).json({ error: 'Missing required fields: email, bookingId, bookingData' });
        }

        // Format booking data for email
        const serviceName = bookingData.packageName || bookingData.serviceName || 'Service';
        const totalPrice = bookingData.price || 0;
        const date = bookingData.date || 'TBD';
        const time = bookingData.time || 'TBD';
        const address = bookingData.address || 'TBD';
        const providerName = bookingData.providerName || 'Provider';

        // Create email content
        const emailContent = {
            to: email,
            message: {
                subject: `Booking Confirmation - ${serviceName}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2563eb;">Booking Confirmation</h2>
                        <p>Thank you for your booking! Here are your booking details:</p>
                        
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin-top: 0;">Booking Details</h3>
                            <p><strong>Service:</strong> ${serviceName}</p>
                            <p><strong>Provider:</strong> ${providerName}</p>
                            <p><strong>Date:</strong> ${date}</p>
                            <p><strong>Time:</strong> ${time}</p>
                            <p><strong>Address:</strong> ${address}</p>
                            <p><strong>Total:</strong> $${totalPrice.toFixed(2)}</p>
                            <p><strong>Booking ID:</strong> ${bookingId}</p>
                        </div>
                        
                        <p>If you have any questions, please contact us.</p>
                        <p>Thank you for choosing Brnno!</p>
                    </div>
                `,
                text: `
                    Booking Confirmation
                    
                    Service: ${serviceName}
                    Provider: ${providerName}
                    Date: ${date}
                    Time: ${time}
                    Address: ${address}
                    Total: $${totalPrice.toFixed(2)}
                    Booking ID: ${bookingId}
                    
                    Thank you for choosing Brnno!
                `
            }
        };

        // Store email in Firestore (you can use a service like SendGrid, Mailgun, or Firebase Extensions for actual email sending)
        // For now, we'll store it in a 'emails' collection for processing
        await db.collection('emails').add({
            ...emailContent,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            type: 'booking_receipt'
        });

        // In production, you would send the email here using a service like SendGrid, Mailgun, or Firebase Extensions
        // For now, we'll just log it and store it in Firestore
        
        console.log(`Email receipt queued for ${email} - Booking ID: ${bookingId}`);

        res.status(200).json({ 
            success: true, 
            message: 'Receipt email queued successfully',
            bookingId 
        });
    } catch (error) {
        console.error('Error sending receipt email:', error);
        res.status(500).json({ 
            error: 'Failed to send receipt email', 
            details: error.message 
        });
    }
};

