import React, { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BryntumCalendar } from '@bryntum/calendar-react';
import '@bryntum/calendar/calendar.classic-dark.css';
import App from './App.jsx';

const Main = () => {
  const [events, setEvents] = useState([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCredentialResponse = (response) => {
      if (response.credential) {
        const userObject = JSON.parse(atob(response.credential.split('.')[1]));
        setUserEmail(userObject.email);
        setIsSignedIn(true);
        loadGapiClient();
      }
    };

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
    });

    // Render the Google sign-in button if not signed in
    if (!isSignedIn) {
      renderSignInButton();
    }

    return () => {
      if (isSignedIn) {
        handleSignOut();
      }
    };
  }, [isSignedIn]);

  const renderSignInButton = () => {
    window.google.accounts.id.renderButton(
      document.getElementById('signInDiv'),
      { theme: 'outline', size: 'large' }
    );
    window.google.accounts.id.prompt();
  };

  const loadGapiClient = () => {
    const script = document.createElement('script');
    script.src = "https://apis.google.com/js/api.js";
    script.onload = initializeGapiClient;
    document.body.appendChild(script);
  };

  const initializeGapiClient = async () => {
    await window.gapi.load('client', async () => {
      await window.gapi.client.init({
        apiKey: import.meta.env.VITE_GOOGLE_CLIENT_API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
      });
    });
  };

  const handleSignOut = () => {
    setIsSignedIn(false);
    setUserEmail('');
    setEvents([]);
    window.google.accounts.id.disableAutoSelect();
  };

  const fetchGoogleCalendarEvents = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: userEmail,
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      });

      if (response.status === 200 && response.result.items) {
        const fetchedEvents = response.result.items.map(event => ({
          id: event.id,
          startDate: new Date(event.start.dateTime || event.start.date),
          endDate: new Date(event.end.dateTime || event.end.date),
          name: event.summary,
        }));
        setEvents(fetchedEvents);
      } else {
        throw new Error('No events found or an error occurred while fetching events');
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(`Error fetching events: ${JSON.stringify(err.result)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StrictMode>
      <App />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!isSignedIn ? (
        <div id="signInDiv"></div>
      ) : (
        <div>
          <p>Logged in as: {userEmail}</p>
          <button onClick={handleSignOut} style={{ backgroundColor: '#FFFFE0', padding: '8px', border: 'none', cursor: 'pointer' }}>Sign Out</button>
          <button onClick={fetchGoogleCalendarEvents} style={{ backgroundColor: '#FFFFE0', padding: '8px', border: 'none', cursor: 'pointer', marginLeft: '10px' }} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Fetch Google Calendar Events'}
          </button>
        </div>
      )}
      <BryntumCalendar events={events} startDate={new Date()} />
    </StrictMode>
  );
};

createRoot(document.getElementById('root')).render(<Main />);
