import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [stations, setStations] = useState([]);
  const [stationStatus, setStationStatus] = useState({});
  const [nearestStation, setNearestStation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState(null);
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [sortedStations, setSortedStations] = useState([]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          setError('Error getting location: ' + error.message);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  // Fetch both station information and status
  const fetchStationData = async () => {
    try {
      const [infoResponse, statusResponse] = await Promise.all([
        axios.get('https://gbfs.citibikenyc.com/gbfs/en/station_information.json'),
        axios.get('https://gbfs.citibikenyc.com/gbfs/en/station_status.json')
      ]);

      // Debug logs for API responses
      console.log('Station Status Response:', statusResponse.data.data.stations[0]);
      console.log('Station Info Response:', infoResponse.data.data.stations[0]);

      setStations(infoResponse.data.data.stations);
      
      const statusMap = {};
      statusResponse.data.data.stations.forEach(station => {
        statusMap[station.station_id] = station;
      });
      setStationStatus(statusMap);
    } catch (err) {
      setError('Error fetching station data: ' + err.message);
    }
  };

  // Find nearest station with available docks
  const findNearestStation = () => {
    if (!userLocation || !stations.length) return;

    const stationsWithDistances = stations
      .map(station => ({
        ...station,
        status: stationStatus[station.station_id],
        distance: calculateDistance(
          userLocation.lat,
          userLocation.lng,
          station.lat,
          station.lon
        )
      }))
      .filter(station => 
        station.status && 
        !station.status.is_installed && 
        !station.status.is_renting
      )
      .sort((a, b) => a.distance - b.distance);

    setSortedStations(stationsWithDistances);
    setNearestStation(stationsWithDistances[currentStationIndex]);
  };

  // Add function to handle "Next Station" click
  const handleNextStation = () => {
    const nextIndex = (currentStationIndex + 1) % sortedStations.length;
    setCurrentStationIndex(nextIndex);
    setNearestStation(sortedStations[nextIndex]);
  };

  useEffect(() => {
    getUserLocation();
    fetchStationData();
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchStationData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userLocation && stations.length && Object.keys(stationStatus).length) {
      setCurrentStationIndex(0);
      findNearestStation();
    }
  }, [userLocation, stations, stationStatus]);

  return (
    <div className="App">
      <h1>Citibike Dock Finder</h1>
      
      {error && <div className="error">{error}</div>}
      
      {userLocation && (
        <div className="location">
          Your location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
        </div>
      )}
      
      {nearestStation && stationStatus[nearestStation.station_id] && (
        <div className="nearest-station">
          {console.log('Nearest Station Data:', nearestStation)}
          {console.log('Station Status Data:', stationStatus[nearestStation.station_id])}
          <h2>Nearest Station:</h2>
          <p className="station-name">{nearestStation.name}</p>
          <div className="station-stats">
            <div className="stat-box">
              <h3>Available Bikes</h3>
              <p className="stat-number">{stationStatus[nearestStation.station_id].num_bikes_available}</p>
            </div>
            <div className="stat-box">
              <h3>Open Docks</h3>
              <p className="stat-number">{stationStatus[nearestStation.station_id].num_docks_available}</p>
            </div>
            <div className="stat-box">
              <h3>Distance</h3>
              <p className="stat-number">{(nearestStation.distance).toFixed(2)} km</p>
            </div>
          </div>
          <div className="station-status">
            <p>Station Status: {stationStatus[nearestStation.station_id].is_installed ? 'Active' : 'Inactive'}</p>
            <p>Last Updated: {new Date(stationStatus[nearestStation.station_id].last_reported * 1000).toLocaleTimeString()}</p>
          </div>
          <div className="station-actions">
            <button 
              onClick={handleNextStation}
              className="next-station-button"
            >
              Show Next Closest Station
            </button>
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${nearestStation.lat},${nearestStation.lon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="directions-button"
            >
              Get Directions
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;