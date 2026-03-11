import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import SearchableSelect from '../components/SearchableSelect';
import * as XLSX from 'xlsx';
import { useI18n } from '../context/I18nContext';

const InvoiceGenerationPage = () => {
  const { user } = useAuth();
  const { t } = useI18n();
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

  const loadInstructors = useCallback(async () => {
    try {
      const response = await apiClient.get('/employees');
      const instructorsList = (response.data.data || []).filter(
        (emp) => emp.designation === 'Instructor'
      );
      setInstructors(instructorsList);
    } catch (error) {
      console.error('Error loading instructors:', error);
    }
  }, []);

  // Load instructors if user is Stable Manager
  useEffect(() => {
    if (user?.designation === 'Stable Manager' || ['Super Admin', 'Director', 'School Administrator'].includes(user?.designation)) {
      loadInstructors();
    }
  }, [user?.designation, loadInstructors]);

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

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([]);

    // Add title
    XLSX.utils.sheet_add_aoa(worksheet, [
      [`Invoice Report`],
      [`Instructor: ${invoice.instructor.fullName}`],
      [`Period: ${new Date(invoice.periodStart).toLocaleDateString('en-IN')} to ${new Date(invoice.periodEnd).toLocaleDateString('en-IN')}`],
      [`Total Sessions: ${invoice.summary.totalSessions}`],
      [`Total Hours: ${invoice.summary.totalHours}`],
      [],
      [`Date`, `Horse`, `Rider`, `Work Type`, `Duration (min)`, `Notes`]
    ], { origin: 'A1' });

    // Add records data
    const recordsData = invoice.records.map(record => [
      new Date(record.date).toLocaleDateString('en-IN'),
      record.horse.name,
      record.rider.fullName,
      record.workType,
      record.duration,
      record.notes || '-'
    ]);

    XLSX.utils.sheet_add_aoa(worksheet, recordsData, { origin: 'A8' });

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 14 },
      { wch: 20 }
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice');

    // Generate filename
    const fileName = `Invoice_${invoice.instructor.fullName}_${new Date(invoice.periodStart).toLocaleDateString('en-IN').replace(/\//g, '-')}.xlsx`;

    // Write file
    XLSX.writeFile(workbook, fileName);
  };

  const handleDownloadCSV = () => {
    if (!invoice) return;

    const escape = (val) => {
      const s = String(val ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const summaryRows = [
      ['Invoice Report'],
      [`Instructor: ${invoice.instructor.fullName}`],
      [`Period: ${new Date(invoice.periodStart).toLocaleDateString('en-IN')} to ${new Date(invoice.periodEnd).toLocaleDateString('en-IN')}`],
      [`Total Sessions: ${invoice.summary.totalSessions}`],
      [`Total Hours: ${invoice.summary.totalHours}`],
      [],
      ['Date', 'Horse', 'Rider', 'Work Type', 'Duration (min)', 'Notes'],
      ...invoice.records.map(record => [
        new Date(record.date).toLocaleDateString('en-IN'),
        record.horse.name,
        record.rider.fullName,
        record.workType,
        record.duration,
        record.notes || '-',
      ]),
    ];

    const csvContent = '\uFEFF' + summaryRows.map(row => row.map(escape).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice_${invoice.instructor.fullName}_${new Date(invoice.periodStart).toLocaleDateString('en-IN').replace(/\//g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <h1>{t('EIRS Invoice')}</h1>
        
        <div class="header-info">
          <p><strong>Instructor:</strong> ${invoiceData.instructor.fullName}</p>
          <p><strong>Invoice ID:</strong> ${invoiceData.invoiceId}</p>
          <p><strong>Period:</strong> ${new Date(invoiceData.periodStart).toLocaleDateString()} to ${new Date(invoiceData.periodEnd).toLocaleDateString()}</p>
          <p><strong>Generated:</strong> ${new Date(invoiceData.generatedDate).toLocaleString()}</p>
        </div>

        <h2>{t('Work Sessions')}</h2>
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

        <h2>{t('Summary by Work Type')}</h2>
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
      <div className="page-header">
        <div>
          <h1>{t('Invoice Generation')}</h1>
          <p>{t('Generate and download instructor invoices')}</p>
        </div>
      </div>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
          <button onClick={() => setMessage('')} className="close-btn">✕</button>
        </div>
      )}

      <div className="card" style={{ padding: '24px', marginBottom: '24px', overflow: 'visible' }}>
        <form onSubmit={handleGenerateInvoice}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
            {user?.designation !== 'Instructor' && (
              <div className="filter-group" style={{ flex: '1 1 200px', minWidth: '180px' }}>
                <label htmlFor="instructorId">Select Instructor</label>
                <SearchableSelect
                  id="instructorId"
                  value={filters.instructorId}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      instructorId: e.target.value,
                    }))
                  }
                  placeholder="All Instructors"
                  options={[
                    { value: '', label: 'All Instructors' },
                    ...instructors.map(i => ({ value: i.id, label: i.fullName }))
                  ]}
                />
              </div>
            )}

            <div className="filter-group" style={{ flex: '0 1 180px' }}>
              <label htmlFor="startDate">From Date</label>
              <input
                type="date"
                id="startDate"
                className="form-input"
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

            <div className="filter-group" style={{ flex: '0 1 180px' }}>
              <label htmlFor="endDate">To Date</label>
              <input
                type="date"
                id="endDate"
                className="form-input"
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

            <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Generating...' : 'Generate Invoice'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {invoice && (
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '4px' }}>Invoice #{invoice.invoiceId}</h2>
              <p style={{ fontWeight: 500, marginBottom: '2px' }}>{invoice.instructor.fullName}</p>
              <p className="period">
                {new Date(invoice.periodStart).toLocaleDateString()} to{' '}
                {new Date(invoice.periodEnd).toLocaleDateString()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-success" onClick={handlePrint}>
                Print
              </button>
              <button className="btn btn-info" onClick={handleDownloadPDF}>
                Download Excel
              </button>
              <button className="btn btn-secondary" onClick={handleDownloadCSV}>
                Download CSV
              </button>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Work Sessions</h3>
            <div style={{ overflowX: 'auto' }}>
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
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Summary by Work Type</h3>
                <table className="records-table">
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

              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Totals</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Sessions</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{invoice.summary.totalSessions}</div>
                  </div>
                  <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Duration</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{invoice.summary.totalDuration} min</div>
                  </div>
                  <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Hours</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{invoice.summary.totalHours}</div>
                  </div>
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
