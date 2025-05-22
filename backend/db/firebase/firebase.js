import admin from 'firebase-admin';
import fs from 'fs';

<<<<<<< HEAD
=======
import fs from 'fs';

>>>>>>> 522805b8f09ce4b4c9ff83b56baefb21a7cdea64

// �������� ���������� JSON-����� ��� ������
const serviceAccount = JSON.parse(
  fs.readFileSync('/app/firebase-service-account.json', 'utf8')
);
<<<<<<< HEAD
=======

>>>>>>> 522805b8f09ce4b4c9ff83b56baefb21a7cdea64

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
