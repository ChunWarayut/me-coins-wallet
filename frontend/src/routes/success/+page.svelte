<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  $: paymentId = $page.url.searchParams.get('payment_id');
  $: status = $page.url.searchParams.get('status');
  $: amount = $page.url.searchParams.get('amount');
  
  let timestamp = '';

  onMount(() => {
    timestamp = new Date().toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  });
</script>

<svelte:head>
  <title>ชำระเงินสำเร็จ</title>
</svelte:head>

<div class="container">
  <div class="card">
    <div class="success-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>

    <div class="status-badge">✓ ชำระเงินสำเร็จ</div>

    <h1>ขอบคุณสำหรับการชำระเงิน!</h1>
    <p class="subtitle">รายการของคุณได้รับการชำระเงินเรียบร้อยแล้ว</p>

    <div class="details">
      <div class="detail-row">
        <span class="label">Payment ID:</span>
        <span class="value">{paymentId || '-'}</span>
      </div>
      <div class="detail-row">
        <span class="label">สถานะ:</span>
        <span class="value">{status === 'success' ? 'ชำระเงินสำเร็จ' : status || '-'}</span>
      </div>
      <div class="detail-row">
        <span class="label">จำนวนเงิน:</span>
        <span class="value amount">
          {amount ? (parseFloat(amount) / 100).toFixed(2) : '-'} THB
        </span>
      </div>
      <div class="detail-row">
        <span class="label">เวลา:</span>
        <span class="value">{timestamp}</span>
      </div>
    </div>

    <a href="/" class="btn">กลับไปหน้าหลัก</a>

    <div class="info-box">
      <h3>💡 นี่คือหน้า Demo Callback</h3>
      <p>
        หน้านี้แสดงตัวอย่างการ redirect กลับมายังระบบต้นทาง หลังจากชำระเงินสำเร็จ
        <br/><br/>
        ในระบบจริง คุณสามารถใช้ <strong>callbackUrl</strong> เพื่อ redirect กลับไปยังหน้าใดก็ได้ของระบบคุณ
        พร้อมกับ query parameters: <code>payment_id</code>, <code>status</code>, และ <code>amount</code>
      </p>
    </div>
  </div>
</div>

<style>
  .container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 20px;
  }

  .card {
    background: white;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    padding: 60px 40px;
    max-width: 600px;
    width: 100%;
    text-align: center;
  }

  .success-icon {
    width: 100px;
    height: 100px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 30px;
    animation: scaleIn 0.5s ease-out;
    color: white;
  }

  @keyframes scaleIn {
    from {
      transform: scale(0);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .success-icon svg {
    width: 50px;
    height: 50px;
  }

  .status-badge {
    display: inline-block;
    background: #48bb78;
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 20px;
  }

  h1 {
    color: #2d3748;
    font-size: 32px;
    margin-bottom: 15px;
    font-weight: 700;
  }

  .subtitle {
    color: #718096;
    font-size: 18px;
    margin-bottom: 40px;
  }

  .details {
    background: #f7fafc;
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 30px;
    text-align: left;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    padding: 15px 0;
    border-bottom: 1px solid #e2e8f0;
  }

  .detail-row:last-child {
    border-bottom: none;
  }

  .label {
    color: #718096;
    font-weight: 500;
  }

  .value {
    color: #2d3748;
    font-weight: 600;
  }

  .amount {
    font-size: 24px;
    color: #667eea;
  }

  .btn {
    display: inline-block;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 40px;
    border-radius: 12px;
    text-decoration: none;
    font-weight: 600;
    font-size: 16px;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }

  .info-box {
    background: #edf2f7;
    border-left: 4px solid #667eea;
    padding: 20px;
    margin-top: 30px;
    border-radius: 8px;
    text-align: left;
  }

  .info-box h3 {
    color: #2d3748;
    font-size: 16px;
    margin-bottom: 10px;
  }

  .info-box p {
    color: #4a5568;
    font-size: 14px;
    line-height: 1.6;
  }

  code {
    background: #e2e8f0;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 12px;
  }
</style>

