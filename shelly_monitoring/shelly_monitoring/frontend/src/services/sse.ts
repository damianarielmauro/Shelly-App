
export const createSSEConnection = (url: string, onMessage: (data: string) => void) => {
  const token = localStorage.getItem('token');

  if (!token) {
    console.error('No token found in localStorage');
    return null;
  }

  const eventSource = new EventSource(`${url}?token=${token}`);

  eventSource.onmessage = (event) => {
    onMessage(event.data);
  };

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    eventSource.close();
  };

  return eventSource;
};
