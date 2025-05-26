document.addEventListener('DOMContentLoaded', function () {
  // তারিখ ফিল্ডে আজকের তারিখ সেট করুন
  const dateInput = document.getElementById('date');
if (dateInput) {
  dateInput.value = new Date().toISOString().split('T')[0];
}

  loadJS();            // jsPDF লাইব্রেরি লোড
  fetchTotalDue();     // মোট বকেয়া লোড
  loadTableData();     // টেবিল ডেটা লোড
  setupEventListeners(); // ইভেন্ট লিসেনার সেটআপ
});

// গ্লোবাল ভেরিয়েবল
let currentPage = 1;
const rowsPerPage = 12;
let allData = [];
const endpoint = 'https://script.google.com/macros/s/AKfycbxWlGYvy9AfQnsE6b0Zr4PD5JaYLCvR15p5qGPPsEjxQZhUlmPGslcKZ9kJeMRR_IPoFA/exec';

// ইভেন্ট লিসেনার সেটআপ
function setupEventListeners() {
  document.getElementById('amountPayable').addEventListener('input', calculateDue);
  document.getElementById('salaryForm').addEventListener('submit', submitSalaryData);
  document.getElementById('prevPage').addEventListener('click', prevPage);
  document.getElementById('nextPage').addEventListener('click', nextPage);
  document.querySelector('.filter-btn').addEventListener('click', applyFilters);
  document.querySelector('.cancel-btn').addEventListener('click', resetFilters);
  
}
// বেতন ও প্রদেয় অর্থ থেকে বকেয়া হিসাব
function calculateDue() {
  const salary = parseFloat(document.getElementById('salaryAmount').value) || 0;
  const payable = parseFloat(document.getElementById('amountPayable').value) || 0;
  const due = salary - payable;
  document.getElementById('monthlyDue').value = due >= 0 ? due.toFixed(2) : 0;
}
// মোট বকেয়া ফেচ
async function fetchTotalDue() {
  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();
    document.getElementById('totalDue').value = data.totalDue.toFixed(2);
    document.getElementById('displayTotalDue').textContent = data.totalDue.toFixed(2);
  } catch (error) {
    console.error('Total due fetch error:', error);
  }
}

// ডেটা লোড ও টেবিল আপডেট
async function loadTableData() {
  const month = document.getElementById('filterMonth').value;
  const year = document.getElementById('filterYear').value;
  let url = `${endpoint}?action=read`;
  if (month) url += `&month=${encodeURIComponent(month)}`;
  if (year) url += `&year=${encodeURIComponent(year)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();
    allData = data.entries || [];
    currentPage = 1;
    updateTable();
  } catch (error) {
    console.error('Error loading data:', error);
    showMessage('ডাটা লোড করতে সমস্যা হয়েছে', 'error');
  }
}

// টেবিল আপডেট (পেজ অনুযায়ী)
function updateTable() {
  const tbody = document.querySelector('#salaryTable tbody');
  tbody.innerHTML = '';

//   const startIdx = (currentPage - 1) * rowsPerPage;
//   const paginatedData = allData.slice(startIdx, startIdx + rowsPerPage);
const startIdx = (currentPage - 1) * rowsPerPage;
  const reversedData = [...allData].reverse(); // Latest entries first
  const paginatedData = reversedData.slice(startIdx, startIdx + rowsPerPage);
  let totalDue = 0;

  if (paginatedData.length > 0) {
    paginatedData.forEach(row => {
      const tr = document.createElement('tr');
      const due = parseFloat(row.monthlyDue) || 0;

      // ✅ শর্ত অনুযায়ী রঙ সেট করা
      if (due === 0) {
        tr.style.backgroundColor = '#d4edda'; // Light green for no due
        tr.style.color = '#155724'; // Dark green text
      } else {
        tr.style.backgroundColor = '#f8d7da'; // Light red for due
        tr.style.color = '#721c24'; // Dark red text
      }
      tr.innerHTML = `
        <td>${formatDate(row.date)}</td>
        <td>${row.month || ''}</td>
        <td>${row.year || ''}</td>
        <td>${row.amountPayable || '0'}</td>
        <td>${row.monthlyDue || '0'}</td>`;
      tbody.appendChild(tr);
      totalDue += parseFloat(row.monthlyDue) || 0;
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="6">কোনো ডাটা পাওয়া যায়নি</td></tr>';
  }

  updatePaginationControls();
  updateTotalDueDisplay(totalDue);
}

// Pagination & Total
function updatePaginationControls() {
  const totalPages = Math.ceil(allData.length / rowsPerPage);
  document.getElementById('pageInfo').textContent = `পৃষ্ঠা ${currentPage} / ${totalPages}`;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage >= totalPages;
}

function updateTotalDueDisplay(totalDue) {
  document.getElementById('totalDue').value = totalDue.toFixed(2);
  document.getElementById('displayTotalDue').textContent = totalDue.toFixed(2);
}

// Pagination actions
function nextPage() {
  const totalPages = Math.ceil(allData.length / rowsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    updateTable();
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    updateTable();
  }
}

// Filter actions
function applyFilters() {
  loadTableData();
}

function resetFilters() {
  document.getElementById('filterMonth').value = '';
  document.getElementById('filterYear').value = '';
  loadTableData();
  showMessage('ফিল্টার ক্যান্সেল করা হয়েছে', 'success');
}

// Form submit
async function submitSalaryData(event) {
  event.preventDefault();
  const form = document.getElementById("salaryForm");
  const formData = new FormData(form);

  const date = formData.get("date");
  const year = formData.get("year");
  const month = formData.get("month");
  const amountPayable = parseFloat(formData.get("amountPayable")) || 0;
  const fixedSalary = parseFloat(formData.get("salaryAmount")) || 0;

  try {
    const response = await fetch(`${endpoint}?action=read&month=${month}&year=${year}`);
    const data = await response.json();
    const entries = data.entries || [];
    const paidSoFar = entries.reduce((sum, e) => sum + (parseFloat(e.amountPayable) || 0), 0);

    const totalPaid = paidSoFar + amountPayable;
    const monthlyDue = Math.max(fixedSalary - totalPaid, 0);
    const totalDue = await calculateTotalDue(month, year, amountPayable, fixedSalary);

    formData.set("monthlyDue", monthlyDue.toFixed(2));
    formData.set("salaryAmount", fixedSalary);
    formData.set("totalDue", totalDue.toFixed(2));

    const submitResponse = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const result = await submitResponse.text();
    if (result === "Success") {
      showMessage("সফলভাবে সাবমিট হয়েছে", "success");
      form.reset();
      fetchTotalDue();
      loadTableData();
    } else {
      throw new Error(result);
    }
  } catch (error) {
    console.error("Submission Error:", error);
    showMessage("সাবমিট করতে সমস্যা হয়েছে", "error");
  }
}

// মাসভিত্তিক ও মোট বকেয়া হিসাব
async function calculateTotalDue(currentMonth, currentYear, currentPayable, currentSalary) {
  const response = await fetch(`${endpoint}?action=read`);
  const data = await response.json();
  const allEntries = data.entries || [];

  // নতুন এন্ট্রি অন্তর্ভুক্ত
  const extendedEntries = [...allEntries, {
    month: currentMonth,
    year: currentYear,
    amountPayable: currentPayable,
    salaryAmount: currentSalary
  }];

  const paidMap = {};
  const salaryMap = {};
  const finalMonthDue = {};

  for (const entry of extendedEntries) {
    const key = `${entry.month}_${entry.year}`;
    const paid = parseFloat(entry.amountPayable || 0);
    const salary = parseFloat(entry.salaryAmount || 0);

    paidMap[key] = (paidMap[key] || 0) + paid;
    salaryMap[key] = salary; // ধরে নিচ্ছি মাসে একটাই salaryAmount থাকবে বা সর্বশেষটি প্রাধান্য পাবে

    finalMonthDue[key] = Math.max((salaryMap[key] || 0) - paidMap[key], 0);
  }

  return Object.values(finalMonthDue).reduce((sum, due) => sum + due, 0);
}

// Date format
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

// Message
// function showMessage(text, type) {
//   const messageEl = document.getElementById('message');
//   messageEl.className = type;
//   messageEl.textContent = text;
//   messageEl.style.display = 'block';
//   setTimeout(() => messageEl.style.display = 'none', 5000);
// }
function showMessage(text, type) {
    const popup = document.getElementById('popup-message');
    popup.textContent = text;
    popup.className = type;
    popup.style.display = 'block';
    
    // Fade in
    setTimeout(() => {
      popup.style.opacity = '1';
    }, 10);
    
    // Fade out after 5 seconds
    setTimeout(() => {
      popup.style.opacity = '0';
      // Hide after fade out transition (300ms)
      setTimeout(() => popup.style.display = 'none', 300);
    }, 5000);
  }
// jsPDF loader
function loadJS() {
  if (!document.querySelector('script[src*="jspdf"]')) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    document.head.appendChild(script);

    const script2 = document.createElement('script');
    script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
    document.head.appendChild(script2);
  }
  if (!document.querySelector('script[src*="autotable"]')) {
    const script2 = document.createElement('script');
    script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
    document.head.appendChild(script2);
  }
}
// generateReport
function generateReport() {
  const monthYearMap = {};
  let totalDue = 0;

  // সর্বশেষ entry ধরে রাখার জন্য map
  allData.forEach(entry => {
    const key = `${entry.month}_${entry.year}`;
    monthYearMap[key] = entry; // একই মাস/বছর হলে সর্বশেষ entry overwrite করবে
  });

  const tbody = document.querySelector('#reportTable tbody');
  tbody.innerHTML = '';

  Object.values(monthYearMap).forEach(entry => {
    const tr = document.createElement('tr');
    const due = parseFloat(entry.monthlyDue || 0);

    let statusText, statusColor;
    if (due === 0) {
      statusText = "Paid";
      statusColor = "green";
    } else {
      statusText = `Due: ${due.toFixed(2)} Taka`;
      statusColor = "red";
      totalDue += due;
    }

    tr.innerHTML = `
      <td>${entry.month}</td>
      <td>${entry.year}</td>
      <td style="color:${statusColor}; font-weight:bold;">${statusText}</td>
    `;
    tbody.appendChild(tr);
  });
  // উপরে মোট বকেয়া দেখাও
  const totalDueElement = document.getElementById('reportTotalDue');
  totalDueElement.textContent = `Total Due: ${totalDue.toFixed(2)} Taka`;
}
 
async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // PDF হেডার
    doc.setFontSize(16);
    doc.text("salary report", 14, 15);

    // তারিখ ও সময়
    const date = new Date();
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-GB');
    doc.setFontSize(10);
    doc.text(`Date: ${formattedDate} Time: ${formattedTime}`, 14, 22);

    // টেবিল থেকে ডেটা সংগ্রহ
    const table = document.getElementById("salaryTable");
    const headers = [];
    table.querySelectorAll("thead tr th").forEach(th => {
      headers.push(th.innerText);
    });

    const rows = [];
    table.querySelectorAll("tbody tr").forEach(tr => {
      const row = [];
      tr.querySelectorAll("td").forEach(td => {
        row.push(td.innerText);
      });
      if (row.length > 0) rows.push(row);
    });

    if (rows.length === 0) {
      alert("কোনো রিপোর্ট ডেটা পাওয়া যায়নি!");
      return;
    }

    // AutoTable ব্যবহার করে PDF-এ টেবিল যুক্ত করা
    doc.autoTable({
      startY: 30,
      head: [headers],
      body: rows,
      styles: { font: 'helvetica', fontSize: 10 },
      headStyles: { fillColor: [0, 102, 204] },
    });

    // মোট বকেয়া টোটাল যুক্ত করা
    const totalDueText = document.getElementById("reportTotalDue").textContent;
    doc.setFontSize(12);
    doc.setTextColor(255, 0, 0);
    doc.text(totalDueText, 14, doc.lastAutoTable.finalY + 10);

    // PDF সেভ
    doc.save("salary_report.pdf");
  }
// generateStatusReportPDF

  async function generateFilteredReportPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(16);
    doc.text("Salary Report", 14, 15);

    // Date & Time
    const date = new Date();
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-GB');
    doc.setFontSize(10);
    doc.text(`Date: ${formattedDate} Time: ${formattedTime}`, 14, 22);

    // Collect data from the visible reportTable rows
    const table = document.getElementById("reportTable");
    const headers = [];
    table.querySelectorAll("thead tr th").forEach(th => {
      headers.push(th.innerText.trim());
    });

    const rows = [];
    table.querySelectorAll("tbody tr").forEach(tr => {
      if (tr.style.display !== "none") { // Only visible rows
        const row = [];
        tr.querySelectorAll("td").forEach(td => {
          row.push(td.innerText.trim());
        });
        if (row.length > 0) rows.push(row);
      }
    });

    if (rows.length === 0) {
      alert("No filtered data found for PDF.");
      return;
    }

    // Insert filtered data into PDF using AutoTable
    doc.autoTable({
      startY: 30,
      head: [headers],
      body: rows,
      styles: { font: 'helvetica', fontSize: 10 },
      headStyles: { fillColor: [0, 102, 204] },
    });

    // Total Due text (if available)
    const totalDueText = document.getElementById("reportTotalDue")?.textContent;
    if (totalDueText) {
      doc.setFontSize(12);
      doc.setTextColor(255, 0, 0);
      doc.text(totalDueText, 14, doc.lastAutoTable.finalY + 10);
    }

    // Save PDF
    doc.save("filtered_salary_report.pdf");
  }

  function applyFilters1() {
  const filterType = document.getElementById("filterType").value;
  const filterYear = document.getElementById("filterYear1").value;

  const table = document.getElementById("reportTable");
  const rows = table.querySelectorAll("tbody tr");

  rows.forEach(row => {
    const status = row.querySelector("td:nth-child(3)").textContent.trim();
    const year = row.querySelector("td:nth-child(2)").textContent.trim();

    let show = true;

    if (filterType && !status.includes(filterType)) {
      show = false;
    }

    if (filterYear && filterYear !== year) {
      show = false;
    }

    row.style.display = show ? "" : "none";
  });
}

function resetFilters2() {
  document.getElementById("filterType").value = "";
  document.getElementById("filterYear1").value = "";
  applyFilters1(); // Reset filters by applying with empty values
}