import {useAuth} from "@clerk/clerk-react"

export const useApi = () => {
    const {getToken} = useAuth()

    const makeRequest = async (endpoint, options = {}) => {
        const token = await getToken()
        // Build headers carefully: if caller passes a FormData body, do not set Content-Type so
        // the browser can add the correct multipart boundary.
        const headers = new Headers(options.headers || {});
        // Only set JSON content type when body is not FormData and no Content-Type provided.
        const bodyIsFormData = options.body instanceof FormData;
        if (!bodyIsFormData && !headers.has('Content-Type')) {
            headers.set('Content-Type', 'application/json');
        }
        // Always set Authorization header
        headers.set('Authorization', `Bearer ${token}`);

        const response = await fetch(`http://localhost:8000/api/${endpoint}`, {
                ...options,
                headers,
            })

        if (!response.ok) {
            const errorData = await response.json().catch(() => null)
            if (response.status === 429) {
                throw new Error("Daily quota exceeded")
            }
            throw new Error(errorData?.detail || "An error occurred")
        }

        return response.json()
    }

    return {makeRequest}
}