import axios from 'axios';

async function main() {
    const loginData = {
        email: 'elzakari1@gmail.com',
        password: 'Barbie@2025'
    };

    try {
        console.log('Logging in as Daro...');
        const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', loginData);
        const token = loginRes.data.data.accessToken;

        console.log('Login successful. Fetching dashboard groups...');
        const groupsRes = await axios.get('http://localhost:3000/api/v1/groups', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log(`Found ${groupsRes.data.data.length} groups on Member Dashboard:`);
        console.log(JSON.stringify(groupsRes.data.data, null, 2));

    } catch (error: any) {
        if (error.response) {
            console.error('API Error:', error.response.status, error.response.data);
        } else {
            console.error('Request Error:', error.message);
        }
    }
}

main();
