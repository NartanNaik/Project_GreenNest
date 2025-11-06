import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

const ExportReports = () => {
  const [exportType, setExportType] = useState('excel');
  const [dateRange, setDateRange] = useState('current');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customRange, setCustomRange] = useState({
    startDate: getFirstDayOfMonth(),
    endDate: getCurrentDate()
  });

  // Helper functions for date handling
  function getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  }

  function getFirstDayOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  }

  function getFirstDayOfPreviousMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  }

  function getLastDayOfPreviousMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
  }

  // Handle date range change
  const handleDateRangeChange = (e) => {
    const range = e.target.value;
    setDateRange(range);

    if (range === 'current') {
      setCustomRange({
        startDate: getFirstDayOfMonth(),
        endDate: getCurrentDate()
      });
    } else if (range === 'previous') {
      setCustomRange({
        startDate: getFirstDayOfPreviousMonth(),
        endDate: getLastDayOfPreviousMonth()
      });
    }
    // If 'custom' is selected, keep the current values
  };

  // Handle custom date changes
  const handleCustomDateChange = (e) => {
    const { name, value } = e.target;
    setCustomRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle export button click
  const handleExport = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to export reports');
        setLoading(false);
        return;
      }

      const response = await axios({
        url: `http://localhost:5000/reports/export`,
        method: 'POST',
        responseType: 'blob', // Important for file downloads
        data: {
          format: exportType,
          startDate: customRange.startDate,
          endDate: customRange.endDate
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Set the filename based on the export type and date range
      const dateStr = `${customRange.startDate}_to_${customRange.endDate}`;
      link.setAttribute('download', `food_report_${dateStr}.${exportType === 'excel' ? 'xlsx' : 'pdf'}`);
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      setLoading(false);
    } catch (err) {
      console.error('Error exporting report:', err);
      setError('Failed to export report. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="export-container">
      <h3>Export Monthly Reports</h3>
      <p className="export-description">
        Download your food usage and wastage data as Excel or PDF files for record-keeping or analysis.
      </p>

      <div className="export-form">
        <div className="form-group">
          <label>Export Format:</label>
          <div className="export-format-options">
            <label className={`export-option ${exportType === 'excel' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="exportType"
                value="excel"
                checked={exportType === 'excel'}
                onChange={() => setExportType('excel')}
              />
              <span className="export-icon">📊</span>
              <span>Excel</span>
            </label>
            <label className={`export-option ${exportType === 'pdf' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="exportType"
                value="pdf"
                checked={exportType === 'pdf'}
                onChange={() => setExportType('pdf')}
              />
              <span className="export-icon">📄</span>
              <span>PDF</span>
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Date Range:</label>
          <select 
            value={dateRange} 
            onChange={handleDateRangeChange}
            className="date-range-select"
          >
            <option value="current">Current Month</option>
            <option value="previous">Previous Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {dateRange === 'custom' && (
          <div className="custom-date-range">
            <div className="form-group">
              <label>Start Date:</label>
              <input
                type="date"
                name="startDate"
                value={customRange.startDate}
                onChange={handleCustomDateChange}
              />
            </div>
            <div className="form-group">
              <label>End Date:</label>
              <input
                type="date"
                name="endDate"
                value={customRange.endDate}
                onChange={handleCustomDateChange}
                min={customRange.startDate}
              />
            </div>
          </div>
        )}

        {error && <div className="export-error">{error}</div>}

        <button 
          className="export-button"
          onClick={handleExport}
          disabled={loading}
        >
          {loading ? 'Generating...' : 'Export Report'}
        </button>
      </div>

      <div className="export-info">
        <h4>What's included in the report?</h4>
        <ul>
          <li>Summary of total food items</li>
          <li>Items consumed vs wasted</li>
          <li>Breakdown by food categories</li>
          <li>Expiry trends and insights</li>
          <li>Estimated cost savings</li>
          <li>Waste reduction progress</li>
        </ul>
      </div>
    </div>
  );
};

export default ExportReports; 