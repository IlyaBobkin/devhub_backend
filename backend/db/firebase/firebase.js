import admin from 'firebase-admin';
import fs from 'fs';

// �������� ���������� JSON-����� ��� ������
const serviceAccount = JSON.parse(
  fs.readFileSync('/app/firebase-service-account.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();

async function sendPushNotification(token, title, body) {
  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: token,
  };

  try {
    const response = await messaging.send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export { sendPushNotification };
