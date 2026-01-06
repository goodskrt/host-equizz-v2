const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      identifier: 'admin@institutsaintjean.org',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('Login successful, token:', token);

    console.log('Testing quizzes API...');
    const quizzesResponse = await axios.get('http://localhost:5000/api/quizzes', {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Quizzes response:', JSON.stringify(quizzesResponse.data, null, 2));

    // Test publish API with a sample quiz
    if (quizzesResponse.data && quizzesResponse.data.length > 0) {
      const quizId = quizzesResponse.data[0].id;
      console.log('Testing publish API for quiz:', quizId);

      const publishResponse = await axios.put(`http://localhost:5000/api/quizzes/${quizId}/publish`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Publish response:', JSON.stringify(publishResponse.data, null, 2));
    }

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testAPI();