// Helper formatting function for comma separators
function formatCurrency(number) {
    if (number === 0) return "-";
    return new Intl.NumberFormat('en-MY', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }).format(number);
}

function calculate() {
    // 1. Gather Inputs
    const planType = document.getElementById('planType').value; // 'MLE' or 'MLEP'
    const faceAmount = parseFloat(document.getElementById('faceAmount').value);
    const entryAge = parseInt(document.getElementById('entryAge').value);
    const premium = parseFloat(document.getElementById('annualPremium').value);
    const gender = document.getElementById('gender').value;
    const isSmoker = document.getElementById('smoking').value === 'Smoker';
    
    // Rider Toggles & Inputs
    const includeMHSE = document.getElementById('includeMHSE').checked;
    const deductible = parseInt(document.getElementById('deductible').value);
    
    const includeMultiCI = document.getElementById('includeMultiCI').checked;
    const multiCIFaceAmount = parseFloat(document.getElementById('multiCIFaceAmount').value);

    let currentBalance = 0;
    const adminCharge = 60; // Flat recurring admin fee
    
    // UI Elements
    const resultsBody = document.getElementById('resultsBody');
    const mhseHeader = document.getElementById('mhseHeader');
    const multiCIHeader = document.getElementById('multiCIHeader');
    
    resultsBody.innerHTML = '';

    // Adjust table headers based on active riders
    mhseHeader.style.display = includeMHSE ? 'table-cell' : 'none';
    multiCIHeader.style.display = includeMultiCI ? 'table-cell' : 'none';

    const maxAge = 99;
    const yearsToProject = Math.min(30, maxAge - entryAge + 1);

    // 2. Projection Loop
    for (let i = 0; i < yearsToProject; i++) {
        let age = entryAge + i;
        
        // Step A: Determine Allocation Rate (Front-end Loading)
        let allocationRate = 0.6;
        if (i >= 3) allocationRate = 0.8;
        if (i >= 6) allocationRate = 0.95;
        if (i >= 8) allocationRate = 1.0;

        let nettPremium = premium * allocationRate;
        
        // Step B: Calculate Sum At Risk (SAR) based on MLE vs MLEP
        // Note: SAR is calculated using the Account Value BEFORE the premium is added
        let sumAtRisk = faceAmount;
        if (planType === 'MLE') {
            // MLE drops the SAR as Account Value grows. If AV > FA, SAR is 0.
            sumAtRisk = Math.max(0, faceAmount - currentBalance);
        }

        // Step C: Calculate Basic COI
        let coiKey = gender + (isSmoker ? '_S' : '_NS');
        let coiRow = coiData.find(d => d.Age === age);
        let basicCOIRate = coiRow ? coiRow[coiKey] : 0;
        
        // Cost is Rate * (Sum At Risk / 1,000)
        let basicCOI = basicCOIRate * (sumAtRisk / 1000); 

        // Step D: Calculate Multi CI Rider Cost
        let actualMultiCICost = 0;
        if (includeMultiCI) {
            let mciKey = gender + (isSmoker ? '_S' : '_NS'); 
            let mciRow = multiciData.find(d => d.Age === age);
            let mciRate = mciRow ? mciRow[mciKey] : 0;
            
            // Rider rates are per 1,000 Sum Assured
            actualMultiCICost = mciRate * (multiCIFaceAmount / 1000);
        }

        // Step E: Calculate MHSE Rider Cost
        let actualMhseCost = 0;
        if (includeMHSE) {
            let mhseRow = mhseData.find(d => d.Age === age && d.Deductible === deductible);
            let mhseCost = 0;
            if (mhseRow) mhseCost = gender === 'Male' ? mhseRow.Male : mhseRow.Female;
            
            // Apply 40% N.NCD (No Claim Discount) mapped from Excel
            actualMhseCost = mhseCost * 0.6; 
        }

        // Step F: Apply to Balance
        currentBalance += nettPremium;
        let totalDeductions = basicCOI + actualMultiCICost + actualMhseCost + adminCharge;
        currentBalance -= totalDeductions;

        // Step G: Render Row
        const isLapsed = currentBalance < 0;
        const rowClass = isLapsed ? 'bg-red-50 text-red-600' : 'hover:bg-slate-50 transition-colors';
        
        // Format Basic COI: if 0, show a clean "-"
        let basicCOIString = basicCOI === 0 ? '<span class="text-slate-400">-</span>' : `- ${formatCurrency(basicCOI)}`;

        // Build dynamic cells based on checkboxes
        let multiCICell = includeMultiCI ? `<td class="p-4 text-right text-rose-500">- ${formatCurrency(actualMultiCICost)}</td>` : '';
        let mhseCell = includeMHSE ? `<td class="p-4 text-right text-rose-500">- ${formatCurrency(actualMhseCost)}</td>` : '';

        const row = `<tr class="${rowClass}">
            <td class="p-4 text-center font-medium">${age}</td>
            <td class="p-4 text-right text-rose-500">${basicCOIString}</td>
            ${multiCICell}
            ${mhseCell}
            <td class="p-4 text-right font-bold ${isLapsed ? 'text-red-600' : 'text-slate-800'}">${formatCurrency(currentBalance)}</td>
        </tr>`;
        
        resultsBody.innerHTML += row;

        // Stop projection if policy lapses
        if (isLapsed) {
            let colSpan = 2 + (includeMultiCI ? 1 : 0) + (includeMHSE ? 1 : 0) + 1;
            resultsBody.innerHTML += `<tr><td colspan="${colSpan}" class="p-4 text-center text-red-600 font-bold bg-red-100 rounded-b-xl">Policy Lapses at Age ${age} due to insufficient funds</td></tr>`;
            break;
        }
    }
}
