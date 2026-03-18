import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1';

async function testStats() {
    try {
        console.log('Testing Admin Stats...');

        // Login as Admin
        const adminAuth = await axios.post(`${API_URL}/auth/login`, {
            email: 'elzakari@live.com',
            password: 'Barbie@2026'
        });
        const adminToken = adminAuth.data.data.accessToken;

        // Get Admin Stats
        const adminStats = await axios.get(`${API_URL}/groups/admin/stats`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        console.log('Admin Stats:', adminStats.data.data);

        console.log('\nTesting Member Stats...');
        // Login as Member
        const memberAuth = await axios.post(`${API_URL}/auth/login`, {
            email: 'elzakari1@gmail.com',
            password: 'Barbie@2025'
        });
        const memberToken = memberAuth.data.data.accessToken;

        // Get Member Stats
        const memberStats = await axios.get(`${API_URL}/groups/member/stats`, {
            headers: { Authorization: `Bearer ${memberToken}` }
        });

        console.log('Member Stats:', memberStats.data.data);

    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testStats();
