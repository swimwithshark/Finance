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
    const planType = document.getElementById('planType').value;
    const faceAmount = parseFloat(document.getElementById('faceAmount').value);
    const entryAge = parseInt(document.getElementById('entryAge').value);
    
    // Premium Mode Mechanics
    const totalAnnualPremium = parseFloat(document.getElementById('annualPremium').value);
    const modeInterval = parseInt(document.getElementById('paymentMode').value); // 12, 6, 3, or 1
    const premiumPerPayment = totalAnnualPremium / (12 / modeInterval);

    const roiRateAnnual = parseFloat(document.getElementById('roi').value) / 100;
    const roiRateMonthly = Math.pow(1 + roiRateAnnual, 1/12) - 1; // Accurate monthly yield
    
    const gender = document.getElementById('gender').value;
    const isSmoker = document.getElementById('smoking').value === 'Smoker';
    
    const includeMHSE = document.getElementById('includeMHSE').checked;
    const deductible = parseInt(document.getElementById('deductible').value);
    
    const includeMultiCI = document.getElementById('includeMultiCI').checked;
    const multiCIFaceAmount = parseFloat(document.getElementById('multiCIFaceAmount').value);

    let currentBalance = 0;
    const adminChargeMonthly = 60 / 12; // 60 RM per year, deducted monthly
    
    // UI Elements
    const resultsBody = document.getElementById('resultsBody');
    const mhseHeader = document.getElementById('mhseHeader');
    const multiCIHeader = document.getElementById('multiCIHeader');
    
    resultsBody.innerHTML = '';
    mhseHeader.style.display = includeMHSE ? 'table-cell' : 'none';
    multiCIHeader.style.display = includeMultiCI ? 'table-cell' : 'none';

    const maxAge = 99;
    const yearsToProject = maxAge - entryAge + 1; 

    // 2. MACRO LOOP: Years
    for (let year = 0; year < yearsToProject; year++) {
        let age = entryAge + year;
        
        // Year-end accumulators for the visual table
        let yearlyBasicCOIPaid = 0;
        let yearlyMultiCIPaid = 0;
        let yearlyMhsePaid = 0;
        let isLapsed = false;

        // Determine Allocation Rate for the year
        let allocationRate = 0.6;
        if (year >= 3) allocationRate = 0.8;
        if (year >= 6) allocationRate = 0.95;
        if (year >= 8) allocationRate = 1.0;

        // Fetch Annual Rates for this exact age
        let coiKey = gender + (isSmoker ? '_S' : '_NS');
        let coiRow = coiData.find(d => d.Age === age);
        let annualBasicCOIRate = coiRow ? coiRow[coiKey] : 0;

        let annualMciRate = 0;
        if (includeMultiCI) {
            let mciRow = multiciData.find(d => d.Age === age);
            annualMciRate = mciRow ? mciRow[coiKey] : 0;
        }

        let annualMhseCost = 0;
        if (includeMHSE) {
            let mhseRow = mhseData.find(d => d.Age === age && d.Deductible === deductible);
            if (mhseRow) annualMhseCost = (gender === 'Male' ? mhseRow.Male : mhseRow.Female) * 0.6; // 40% NCD
        }

        // 3. MICRO LOOP: Months (1 to 12)
        for (let month = 1; month <= 12; month++) {
            
            // Step A: Inject Premium if it's a payment month
            // Example: Quarterly (interval 3) pays on month 1, 4, 7, 10.
            if ((month - 1) % modeInterval === 0) {
                currentBalance += (premiumPerPayment * allocationRate);
            }

            // Step B: Calculate Dynamic Sum At Risk (SAR)
            let sumAtRisk = faceAmount;
            if (planType === 'MLE') {
                sumAtRisk = Math.max(0, faceAmount - currentBalance);
            }

            // Step C: Calculate exact monthly deductions
            let monthlyBasicCOI = (annualBasicCOIRate * (sumAtRisk / 1000)) / 12;
            let monthlyMultiCI = (annualMciRate * (multiCIFaceAmount / 1000)) / 12;
            let monthlyMhse = annualMhseCost / 12;

            // Step D: Apply Flow to Balance
            currentBalance -= (monthlyBasicCOI + monthlyMultiCI + monthlyMhse + adminChargeMonthly);

            // Accumulate for the visual table
            yearlyBasicCOIPaid += monthlyBasicCOI;
            yearlyMultiCIPaid += monthlyMultiCI;
            yearlyMhsePaid += monthlyMhse;

            // Step E: Apply Investment ROI (Only if balance is positive)
            if (currentBalance > 0) {
                currentBalance += (currentBalance * roiRateMonthly);
            } else {
                isLapsed = true;
                break; // Stop micro-loop if money runs out
            }
        }

        // 4. Render the Annual Summary Row
        const rowClass = isLapsed ? 'bg-red-50 text-red-600' : 'hover:bg-emerald-50 transition-colors';
        
        let basicCOIString = yearlyBasicCOIPaid === 0 ? '<span class="text-slate-300">-</span>' : `- ${formatCurrency(yearlyBasicCOIPaid)}`;
        let multiCICell = includeMultiCI ? `<td class="p-4 text-right text-rose-500">- ${formatCurrency(yearlyMultiCIPaid)}</td>` : '';
        let mhseCell = includeMHSE ? `<td class="p-4 text-right text-rose-500">- ${formatCurrency(yearlyMhsePaid)}</td>` : '';

        const row = `<tr class="${rowClass}">
            <td class="p-4 text-center font-bold text-slate-700">${age}</td>
            <td class="p-4 text-right text-rose-500 font-medium">${basicCOIString}</td>
            ${multiCICell}
            ${mhseCell}
            <td class="p-4 text-right font-bold text-lg ${isLapsed ? 'text-red-600' : 'text-emerald-700'}">${formatCurrency(currentBalance)}</td>
        </tr>`;
        
        resultsBody.innerHTML += row;

        // Stop projection entirely if policy lapsed
        if (isLapsed) {
            let colSpan = 2 + (includeMultiCI ? 1 : 0) + (includeMHSE ? 1 : 0) + 1;
            resultsBody.innerHTML += `<tr><td colspan="${colSpan}" class="p-6 text-center text-red-700 font-bold bg-red-100 rounded-b-xl border-t border-red-200 uppercase tracking-wider text-xs">Policy Lapses at Age ${age} due to insufficient account value</td></tr>`;
            break;
        }
    }
}
