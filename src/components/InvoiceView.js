import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Box, Button, CircularProgress, Divider, Typography, useTheme } from '@mui/material';
import { formatCurrency, formatDate } from '../utils/formatting';

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
        try {
          invoiceRes = await axios.get(`/api/payments/${id}/invoice`);
        } catch (e1) {
          // fallback to alternate path
          invoiceRes = await axios.get(`/api/payments/invoice/${id}`);
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
    window.print();
  };

  if (loading) { return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>; }
  if (error) { return <Typography color="error" sx={{ mt: 4 }}>{error}</Typography>; }
  if (!data) { return null; }

  const { invoice, settings } = data;
  const currency = settings?.currency || 'INR';
  const gymName = settings?.gym_name || 'Gym';

  return (
    <Box sx={{ backgroundColor: '#fafafa', p: 2 }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', background: 'white', p: 3, borderRadius: 1, boxShadow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight={700}>{gymName}</Typography>
            <Typography variant="caption">Quotation / Tax Invoice</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h6" sx={{ color: brand.primary }}>INVOICE</Typography>
            <Typography variant="body2">Invoice No.: {invoice.invoice_id}</Typography>
            <Typography variant="body2">Payment ID: {invoice.payment_id}</Typography>
            <Typography variant="body2">Date: {formatDate(invoice.payment_date)}</Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 2, p: 2, background: brand.primary, color: 'white', borderRadius: 1 }}>
          <Typography variant="subtitle2">Bill To</Typography>
          <Typography variant="body1" fontWeight={600}>{invoice.member_name || 'Member'}</Typography>
          <Typography variant="body2">{invoice.member_email}</Typography>
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
          <Box sx={{ '@media print': { display: 'none' } }}>
            <Button variant="outlined" onClick={handlePrint} sx={{ mr: 1 }}>Print</Button>
            <Button variant="contained" onClick={handlePrint}>Download PDF</Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default InvoiceView;


