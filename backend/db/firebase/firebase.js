import admin from 'firebase-admin';

// Вставьте содержимое JSON-файла как объект
const serviceAccount = {
  "type": "service_account",
  "project_id": "ancient-flag-460221-s8",
  "private_key_id": "08fa7a6499350f103a6ca4dc0fe2519bfc7eace5",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDYYoZJ7CqoXs2E\nP5xlQxq4drXWm/wYmWd9unAKRAPwvEtqhWsAZ/pzEx0OTSHbmG2NiJ5ATvVb+gWy\nhp2NRuG6kigl1Eu8Wf3ilpmQrE+6bC2CA0jxRf/za1ZV3+59EzQirgUrIoYT7sza\n/03/IwlEjvGSK8+CZ1wYUQm0grx2T/UHN4ljE83bV/n/5A0WeUvo2h5h5yYfffkI\nnX8otBi6M86cANCuqR+F+Ds++9UhrYEk/6JLqg28Pt0RxpEAIcDxavuaBJc6pkTY\nw2Va+9NJQXo/ORCq5u06v/fzLlE0M3vkYFmAZqnQD3XrlLt46fEYfOPLcEswlznG\nfyygSOu1AgMBAAECggEAD0gN/HnS8rxsk91mLySTu4Pusu77LnA5sIBn2eG/IX46\nw+q+NB4jwC1mYj8s7UmQ2xZTOW7Ewdp2Eos9Od/6oGbNXQvmzrDQTvNHJGzMM082\ne4sTLgQ9NN9XY+MtADpIoUuxjmqha2ue82G6YWgDseAidqnkvWyNQs5eUBg3imdZ\nQ1H5S6gHlcel1MHzFth2wJMEgSfu4TEayDGVjKlGuK/5ADkBgObijp6Y9fNykL2d\n5qXWoJzUWxUCVUFKiK9cyv1jum/tKGxm1tC5nYH261IX0bFAW4XEkP10su2CsIQS\nf0jmwsyjzT2R44OoJQ9HpcWxFSgWFd3Pts7anLQc1QKBgQDuLoVnGgYPIRukKfd2\nU/1Yc3zKnLVlXDmVBPz4+/KVJYf8zbfZeBTWMzC2m024+/DbEE+0uLkvMULNRtdi\nhA5s8q3SrgYTjZgTRAUm0/YVgiD6bANLam/qlPa94rd1PkiABEKLECMILo++O275\nXJEMmUgws084MSlsZWtEQkH5rwKBgQDokpDzKXimFmibIw8X4vCbU6Mk95iFDmr7\nKfl6rMZXf99eYNwu4U3nokDgVXvlOytUE3wauFfS/NnNCRtU8icfInp8/IhyXNKl\nQyCjVDbjvhxJtJT+5h2osAkvINflkJ5um82aKtN7UzZsM6EtUfBjc8r9Kit6Un55\nZopmBcid2wKBgQClzfDD4xPQuGV7lFNWJgW46zw19303QEo9eKl50jn+pY/S5opT\ncwpeSmhg1h/25Du449P4pJcVSR+NswEA7Zj1MsLaZJaKSglRcAp+CxPFyT6X1VU9\nzKx4CpbxfL/leCQUKeMA14zrhy49aTZJlKzMrm/YpxpArch+UuOnMtCmtQKBgQDO\nvrPyJXSmGJeHCaR6NHh1a+VEkIHaDlYVzluDrSFoWTkkufAiEJFjj34irntD7NR4\nmhWh3yvbWID5XtYYLmeOquS+RPO6zj9HQCQ8bTmaPL8C2m/1JHVLJqoTZhvmbCga\n5Y/hM57qK6/eggsOsZ+DmUTixuD9jWX236u6Q/vyLwKBgDVorLRderAtpxNmwHkW\nJ2rAZfnTRPKTwRo1x1bLXZORzABFrjz8rWRZj2y/LvPnYA59Q2LM+tHwv1Bam01Y\ng5XKa7Cq7KLYVxesXDDSeF7n3VfKUIrj8Jdp2u8c1KGgHV1E2ZGp/ZzlKS2fYYGh\nHkiRKws0/2YrraaNIYAzDlGH\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@ancient-flag-460221-s8.iam.gserviceaccount.com",
  "client_id": "117581604139198119280",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40ancient-flag-460221-s8.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

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