<script lang="ts">
  let amount = 10;
  let email = 'humansaees0@gmail.com';
  let description = 'Demo Payment from SvelteKit';
  let loading = false;
  let error = '';

  async function startPayment() {
    if (loading) return;
    
    if (amount < 1) {
      error = 'จำนวนเงินต้องมากกว่า 1 บาท';
      return;
    }
    
    if (!email.includes('@')) {
      error = 'กรุณากรอกอีเมลที่ถูกต้อง';
      return;
    }

    loading = true;
    error = '';

    try {
      const res = await fetch('/payments/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(amount * 100),
          email,
          description,
          callbackUrl: `${location.origin}/success`,
          cancelUrl: `${location.origin}/cancel`,
          metadata: { source: 'sveltekit-demo' }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to create payment');
      }

      const data = await res.json();
      
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (err: any) {
      error = err.message;
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Demo SvelteKit PromptPay Payment</title>
</svelte:head>

<div class="container">
  <div class="card">
    <h1>💳 Demo SvelteKit PromptPay</h1>
    <p class="subtitle">ทดสอบระบบชำระเงินแบบ Centralized UI</p>

    <div class="form">
      <div class="form-group">
        <label for="amount">จำนวนเงิน (THB)</label>
        <input 
          id="amount"
          type="number" 
          bind:value={amount} 
          min="1" 
          step="1"
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label for="email">อีเมล (สำหรับ PromptPay)</label>
        <input 
          id="email"
          type="email" 
          bind:value={email}
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label for="description">รายละเอียด</label>
        <input 
          id="description"
          type="text" 
          bind:value={description}
          disabled={loading}
        />
      </div>

      {#if error}
        <div class="error">{error}</div>
      {/if}

      <button on:click={startPayment} disabled={loading} class="btn-primary">
        {loading ? '⏳ กำลังสร้าง Payment...' : '🚀 ชำระเงินทันที'}
      </button>
    </div>

    <div class="info-box">
      <h3>💡 ขั้นตอนการทำงาน</h3>
      <ol>
        <li>กดปุ่ม "ชำระเงินทันที" → สร้าง PaymentIntent</li>
        <li>Redirect ไปหน้าชำระเงิน → แสดง QR Code</li>
        <li>สแกน QR และจ่ายเงินผ่าน PromptPay</li>
        <li>ระบบ auto-poll สถานะทุก 3 วินาที</li>
        <li>Callback กลับมาหน้า Success พร้อม payment_id</li>
      </ol>
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
    padding: 40px;
    max-width: 500px;
    width: 100%;
  }

  h1 {
    color: #2d3748;
    font-size: 28px;
    margin-bottom: 10px;
    text-align: center;
  }

  .subtitle {
    color: #718096;
    text-align: center;
    margin-bottom: 30px;
  }

  .form {
    margin-bottom: 30px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  label {
    display: block;
    color: #4a5568;
    font-weight: 600;
    margin-bottom: 8px;
    font-size: 14px;
  }

  input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 16px;
    transition: border-color 0.2s;
  }

  input:focus {
    outline: none;
    border-color: #667eea;
  }

  input:disabled {
    background: #f7fafc;
    cursor: not-allowed;
  }

  .btn-primary {
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
  }

  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    background: #fff5f5;
    border: 1px solid #fc8181;
    color: #c53030;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
  }

  .info-box {
    background: #f0f4f8;
    border-left: 4px solid #667eea;
    padding: 20px;
    border-radius: 8px;
  }

  .info-box h3 {
    color: #2d3748;
    font-size: 16px;
    margin-bottom: 15px;
  }

  .info-box ol {
    margin-left: 20px;
    color: #4a5568;
    font-size: 14px;
    line-height: 1.8;
  }

  .info-box li {
    margin-bottom: 8px;
  }
</style>
