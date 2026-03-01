import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 50 }, // ramp up to 50 concurrent virtual users
        { duration: '1m', target: 50 },  // stay at 50 users for 1 minute
        { duration: '30s', target: 0 },  // ramp down to 0 users
    ],
    thresholds: {
        // 95% of requests must complete below 500ms
        http_req_duration: ['p(95)<500'],
        // Error rate must be less than 1%
        http_req_failed: ['rate<0.01'],
    },
};

export default function () {
    // Test the most expensive query endpoint (Fleet Overview)
    const url = 'http://localhost:3000/api/telemetry/fleet/overview';

    // Mock authentication cookie to bypass mock login screen
    const params = {
        headers: {
            'Cookie': 'auth_role=ceo',
        },
    };

    const res = http.get(url, params);

    check(res, {
        'status was 200': (r) => r.status === 200,
        'transaction time OK': (r) => r.timings.duration < 500,
    });

    // Wait 1 second between requests per virtual user
    sleep(1);
}
