import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import '../styles/InvoiceGenerationPage.css';

const InvoiceGenerationPage = () => {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [instructors, setInstructors] = useState([]);

  const [filters, setFilters] = useState({
    instructorId: user?.designation === 'Instructor' ? user.id : '',
    startDate: getMonthStart(),
    endDate: getMonthEnd(),
  });

  function getMonthStart() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  }

  function getMonthEnd() {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  // Load instructors if user is Stable Manager
  useEffect(() => {
    if (user?.designation === 'Stable Manager' || ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation)) {
      loadInstructors();
    }
  }, []);

  const loadInstructors = async () => {
    try {
      const response = await apiClient.get('/employees');
      const instructorsList = (response.data.data || []).filter(
        (emp) => emp.designation === 'Instructor'
      );
      setInstructors(instructorsList);
    } catch (error) {
      console.error('Error loading instructors:', error);
    }
  };

  const handleGenerateInvoice = async (e) => {
    e.preventDefault();

    if (!filters.startDate || !filters.endDate) {
      setMessage('Please select both start and end dates');
      setMessageType('error');
      return;
    }

    if (new Date(filters.startDate) > new Date(filters.endDate)) {
      setMessage('Start date must be before end date');
      setMessageType('error');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.post('/eirs/invoice/generate', {
        instructorId: filters.instructorId || undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });

      setInvoice(response.data.data);
      setMessage('Invoice generated successfully');
      setMessageType('success');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to generate invoice');
      setMessageType('error');
      setInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!invoice) return;

    // Generate PDF content
    const docTitle = `Invoice_${invoice.instructor.fullName}_${invoice.periodStart}_${invoice.periodEnd}.pdf`;
    const doc = generatePDFContent(invoice);

    // Create a blob and download
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(doc));
    element.setAttribute('download', docTitle);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    if (!invoice) return;

    const printWindow = window.open('', '', 'width=900,height=600');
    if (printWindow) {
      printWindow.document.write(generatePDFContent(invoice));
      printWindow.document.close();
      printWindow.print();
    }
  };

  const generatePDFContent = (invoiceData) => {
    const recordsHTML = invoiceData.records
      .map(
        (r) => `
        <tr>
          <td>${new Date(r.date).toLocaleDateString()}</td>
          <td>${r.horse.name}</td>
          <td>${r.rider.fullName}</td>
          <td>${r.workType}</td>
          <td>${r.duration}</td>
          <td>${r.notes || '-'}</td>
        </tr>
      `
      )
      .join('');

    const workTypeSummary = Object.entries(invoiceData.summary.byWorkType)
      .map(
        ([type, data]) => `
        <tr>
          <td>${type}</td>
          <td>${data.count}</td>
          <td>${data.duration} min</td>
          <td>${Math.round((data.duration / 60) * 100) / 100} hrs</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { text-align: center; color: #2c3e50; }
          .header-info { margin: 20px 0; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
          .header-info p { margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #3498db; color: white; padding: 10px; text-align: left; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          tr:hover { background-color: #f5f5f5; }
          .summary { background-color: #ecf0f1; padding: 15px; margin: 20px 0; border-left: 4px solid #3498db; }
          .summary-stat { display: inline-block; margin-right: 30px; }
          .summary-stat strong { color: #2c3e50; }
          .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #7f8c8d; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>EIRS Invoice</h1>
        
        <div class="header-info">
          <p><strong>Instructor:</strong> ${invoiceData.instructor.fullName}</p>
          <p><strong>Invoice ID:</strong> ${invoiceData.invoiceId}</p>
          <p><strong>Period:</strong> ${new Date(invoiceData.periodStart).toLocaleDateString()} to ${new Date(invoiceData.periodEnd).toLocaleDateString()}</p>
          <p><strong>Generated:</strong> ${new Date(invoiceData.generatedDate).toLocaleString()}</p>
        </div>

        <h2>Work Sessions</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Horse</th>
              <th>Rider</th>
              <th>Type</th>
              <th>Duration (min)</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${recordsHTML}
          </tbody>
        </table>

        <h2>Summary by Work Type</h2>
        <table>
          <thead>
            <tr>
              <th>Work Type</th>
              <th>Sessions</th>
              <th>Total Duration</th>
              <th>Total Hours</th>
            </tr>
          </thead>
          <tbody>
            ${workTypeSummary}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-stat">
            <strong>Total Sessions:</strong> ${invoiceData.summary.totalSessions}
          </div>
          <div class="summary-stat">
            <strong>Total Duration:</strong> ${invoiceData.summary.totalDuration} minutes
          </div>
          <div class="summary-stat">
            <strong>Total Hours:</strong> ${invoiceData.summary.totalHours}
          </div>
        </div>

        <div class="footer">
          <p>This is an automated invoice generated from the EIRS system.</p>
          <p>For queries, contact the administration.</p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="invoice-generation-page">
      <h1>Invoice Generation</h1>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
          <button onClick={() => setMessage('')} className="close-btn">✕</button>
        </div>
      )}

      <div className="filter-container">
        <form onSubmit={handleGenerateInvoice}>
          <div className="filter-row">
            {user?.designation !== 'Instructor' && (
              <div className="filter-group">
                <label htmlFor="instructorId">Select Instructor</label>
                <select
                  id="instructorId"
                  value={filters.instructorId}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      instructorId: e.target.value,
                    }))
                  }
                >
                  <option value="">All Instructors</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.id}>
                      {instructor.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="filter-group">
              <label htmlFor="startDate">From Date</label>
              <input
                type="date"
                id="startDate"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="filter-group">
              <label htmlFor="endDate">To Date</label>
              <input
                type="date"
                id="endDate"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="filter-group">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Invoice'}
              </button>
            </div>
          </div>

          <div className="quick-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  startDate: getMonthStart(),
                  endDate: getMonthEnd(),
                }))
              }
            >
              This Month
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
                setFilters((prev) => ({
                  ...prev,
                  startDate: lastMonth.toISOString().split('T')[0],
                  endDate: lastMonthEnd.toISOString().split('T')[0],
                }));
              }}
            >
              Last Month
            </button>
          </div>
        </form>
      </div>

      {invoice && (
        <div className="invoice-container">
          <div className="invoice-header">
            <div>
              <h2>Invoice #{invoice.invoiceId}</h2>
              <p className="instructor-name">{invoice.instructor.fullName}</p>
              <p className="period">
                {new Date(invoice.periodStart).toLocaleDateString()} to{' '}
                {new Date(invoice.periodEnd).toLocaleDateString()}
              </p>
            </div>
            <div className="invoice-actions">
              <button className="btn btn-success" onClick={handlePrint}>
                🖨 Print
              </button>
              <button className="btn btn-info" onClick={handleDownloadPDF}>
                📥 Download PDF
              </button>
            </div>
          </div>

          <div className="invoice-content">
            <h3>Work Sessions</h3>
            <table className="records-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Horse</th>
                  <th>Rider</th>
                  <th>Type</th>
                  <th>Duration (min)</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {invoice.records.map((record, index) => (
                  <tr key={index}>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                    <td>{record.horse.name}</td>
                    <td>{record.rider.fullName}</td>
                    <td>{record.workType}</td>
                    <td>{record.duration}</td>
                    <td>{record.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="summary-container">
              <div className="summary-section">
                <h3>Summary by Work Type</h3>
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>Work Type</th>
                      <th>Sessions</th>
                      <th>Duration</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(invoice.summary.byWorkType).map(
                      ([type, data]) => (
                        <tr key={type}>
                          <td>{type}</td>
                          <td>{data.count}</td>
                          <td>{data.duration} min</td>
                          <td>{Math.round((data.duration / 60) * 100) / 100}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <div className="summary-stats">
                <div className="stat-box">
                  <div className="stat-label">Total Sessions</div>
                  <div className="stat-value">{invoice.summary.totalSessions}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Total Duration</div>
                  <div className="stat-value">{invoice.summary.totalDuration} min</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Total Hours</div>
                  <div className="stat-value">{invoice.summary.totalHours}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!invoice && !loading && (
        <div className="no-invoice">
          <p>Generate an invoice by selecting dates and clicking "Generate Invoice"</p>
        </div>
      )}
    </div>
  );
};

export default InvoiceGenerationPage;
