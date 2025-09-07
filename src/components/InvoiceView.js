import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Box, Button, CircularProgress, Divider, Typography, useTheme, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { formatCurrency, formatDate } from '../utils/formatting';
import { FormShimmer } from './ShimmerLoader';

const numberToWords = (amount) => {
  try {
    // crude words; keeping simple
    const whole = Math.round(Number(amount));
    const ones = ['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    const toWords = (n) => {
      if (n < 20) { return ones[n]; }
      if (n < 100) { return tens[Math.floor(n/10)] + (n%10?` ${ones[n%10]}`:''); }
      if (n < 1000) { return `${ones[Math.floor(n/100)]} Hundred${n%100?` ${toWords(n%100)}`:''}`; }
      if (n < 100000) { return `${toWords(Math.floor(n/1000))} Thousand${n%1000?` ${toWords(n%1000)}`:''}`; }
      if (n < 10000000) { return `${toWords(Math.floor(n/100000))} Lakh${n%100000?` ${toWords(n%100000)}`:''}`; }
      return String(n);
    };
    return toWords(whole) + ' Rupees';
  } catch (e) {
    return '';
  }
};

const InvoiceView = () => {
  const { id } = useParams(); // payment id
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const brand = useMemo(() => ({
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main
  }), [theme]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        let invoiceRes;
        // Try by payment id endpoints
        try {
          invoiceRes = await axios.get(`/api/payments/${id}/invoice`);
        } catch (e1) {
          try {
            invoiceRes = await axios.get(`/api/payments/invoice/${id}`);
          } catch (e2) {
            // Try by invoice id endpoint
            invoiceRes = await axios.get(`/api/payments/invoices/${id}`);
          }
        }
        const settingsRes = await axios.get('/api/settings');
        setData({ invoice: invoiceRes.data, settings: settingsRes.data });
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handlePrint = () => {
    const node = document.getElementById('invoice-root');
    if (!node) { window.print(); return; }
    const printWindow = window.open('', 'PRINT', 'height=800,width=800');
    if (!printWindow) { window.print(); return; }
    printWindow.document.write(`<html><head><title>Invoice</title>`);
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(el => el.outerHTML).join('\n');
    printWindow.document.write(styles);
    printWindow.document.write('</head><body>');
    printWindow.document.write(node.outerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleDownloadPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      const node = document.getElementById('invoice-root');
      if (!node) { return handlePrint(); }
      const canvas = await html2canvas(node, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let position = 0;
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      } else {
        // paginate
        let remaining = imgHeight;
        let y = 0;
        while (remaining > 0) {
          pdf.addImage(imgData, 'PNG', 0, y ? -y : 0, imgWidth, imgHeight);
          remaining -= pageHeight;
          y += pageHeight;
          if (remaining > 0) { pdf.addPage(); }
        }
      }
      pdf.save(`invoice-${invoice.invoice_id || invoice.payment_id}.pdf`);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) { return <FormShimmer />; }
  if (error) { return <Typography color="error" sx={{ mt: 4 }}>{error}</Typography>; }
  if (!data) { return null; }

  const { invoice, settings } = data;
  const currency = settings?.currency || 'INR';
  const gymName = settings?.gym_name || 'Gym';

  return (
    <Box>
      {/* Top-left back chevron (not printed) */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1, mb: 1, '@media print': { display: 'none' } }}>
        <IconButton aria-label="Back to Financials" onClick={() => navigate('/financials')}>
          <ChevronLeftIcon />
        </IconButton>
      </Box>
      <Box id="invoice-root" sx={{ maxWidth: 900, mx: 'auto', background: 'white', p: 4, borderRadius: 2, boxShadow: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>{gymName}</Typography>
            <Typography variant="caption">Quotation / Tax Invoice</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" sx={{ color: 'var(--accent-secondary-color)' }}>INVOICE</Typography>
            <Typography variant="body2">Invoice No.: {invoice.invoice_id}</Typography>
            <Typography variant="body2">Payment ID: {invoice.payment_id}</Typography>
            <Typography variant="body2">Date: {formatDate(invoice.payment_date)}</Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 2, p: 2, background: brand.primary, color: 'white', borderRadius: 1 }}>
          <Typography variant="subtitle2">Bill To</Typography>
          <Typography variant="body1" fontWeight={600}>{invoice.member_name || 'Member'}</Typography>
          {invoice.member_email && (<Typography variant="body2">{invoice.member_email}</Typography>)}
          {invoice.member_phone && (<Typography variant="body2">{invoice.member_phone}</Typography>)}
        </Box>

        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 140px', fontWeight: 600, borderBottom: `2px solid ${brand.secondary}`, py: 1 }}>
            <div>Services</div>
            <div>Qty</div>
            <div>Rate</div>
            <div style={{ textAlign: 'right' }}>Amount</div>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 140px', py: 1, borderBottom: '1px solid #eee' }}>
            <div>{invoice.plan_name || 'Membership Fee'}</div>
            <div>1</div>
            <div>{formatCurrency(invoice.invoice_amount, currency)}</div>
            <div style={{ textAlign: 'right' }}>{formatCurrency(invoice.payment_amount || invoice.invoice_amount, currency)}</div>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Terms and Conditions</Typography>
              <Typography variant="caption" display="block">Goods/services once sold will not be taken back or exchanged.</Typography>
              <Typography variant="caption" display="block">All disputes are subject to local jurisdiction.</Typography>
            </Box>
            <Box sx={{ minWidth: 260 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderTop: '1px solid #ddd' }}>
                <Typography variant="body2">Total</Typography>
                <Typography variant="body2">{formatCurrency(invoice.payment_amount || invoice.invoice_amount, currency)}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2">Amount in words</Typography>
                <Typography variant="body2" textAlign="right">{numberToWords(invoice.payment_amount || invoice.invoice_amount)}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption">This is a computer-generated invoice.</Typography>
        </Box>
      </Box>
      {/* Actions row separated to avoid printing, plus WhatsApp share */}
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', '@media print': { display: 'none' } }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!invoice.payment_id && (
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => navigate(`/financials?editInvoice=${invoice.invoice_id}`)}
            >
              Edit Invoice
            </Button>
          )}
          <Button onClick={handlePrint}>Print</Button>
          <Button variant="outlined" onClick={handleDownloadPdf}>Download PDF</Button>
          <Button variant="contained" color="success" onClick={async () => {
          try {
            const phone = (invoice.member_phone || '').replace(/\D/g, '');
            await handleDownloadPdf();
            const text = encodeURIComponent(`Invoice #${invoice.invoice_id} for ${invoice.member_name} - Amount ${formatCurrency(invoice.payment_amount || invoice.invoice_amount, currency)}`);
            const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
            window.open(waUrl, '_blank');
          } catch (e) {
            console.error(e);
          }
        }}>Send via WhatsApp</Button>
        </Box>
      </Box>
    </Box>
  );
};

export default InvoiceView;


