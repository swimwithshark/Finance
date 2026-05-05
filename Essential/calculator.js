function calculate() {
    // 1. Gather Inputs
    const faceAmount = parseFloat(document.getElementById('faceAmount').value);
    const entryAge = parseInt(document.getElementById('entryAge').value);
    const premium = parseFloat(document.getElementById('annualPremium').value);
    const gender = document.getElementById('gender').value;
    const isSmoker = document.getElementById('smoking').value === 'Smoker';
    
    // MHSE Logic
    const includeMHSE = document.getElementById('includeMHSE').checked;
    const deductible = parseInt(document.getElementById('deductible').value);

    let currentBalance = 0;
    const adminCharge = 60; // Flat recurring admin fee
    const resultsBody = document.getElementById('resultsBody');
    const mhseHeader = document.getElementById('mhseHeader');
    resultsBody.innerHTML = '';

    // Adjust table header based on MHSE inclusion
    mhseHeader.style.display = includeMHSE ? 'table-cell' : 'none';

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
        
        // Step B: Calculate Basic COI based on Face Amount
        let coiKey = gender + (isSmoker ? '_S' : '_NS');
        let coiRow = coiData.find(d => d.Age === age);
        let basicCOIRate = coiRow ? coiRow[coiKey] : 0;
        
        // In the Excel logic, the COI charge is determined by a rate multiplied by the Sum at Risk.
        // Assuming the base rate is per thousand of Face Amount initially:
        let basicCOI = basicCOIRate * (faceAmount / 100000); 

        // Step C: Calculate MHSE Rider Cost
        let actualMhseCost = 0;
        if (includeMHSE) {
            let mhseRow = mhseData.find(d => d.Age === age && d.Deductible === deductible);
            let mhseCost = 0;
            if (mhseRow) mhseCost = gender === 'Male' ? mhseRow.Male : mhseRow.Female;
            
            // Apply 40% N.NCD (No Claim Discount) mapped from Excel
            actualMhseCost = mhseCost * 0.6; 
        }

        // Step D: Calculate Ending Balance
        currentBalance += nettPremium;
        let totalDeductions = basicCOI + actualMhseCost + adminCharge;
        currentBalance -= totalDeductions;

        // Step E: Render Row
        const isLapsed = currentBalance < 0;
        const rowClass = isLapsed ? 'bg-red-50 text-red-600' : 'hover:bg-slate-50 transition-colors';
        
        let mhseCell = includeMHSE ? `<td class="p-4 text-right text-rose-500">- ${actualMhseCost.toFixed(2)}</td>` : '';

        const row = `<tr class="${rowClass}">
            <td class="p-4 text-center font-medium">${age}</td>
            <td class="p-4 text-right text-emerald-600">+ ${nettPremium.toFixed(2)}</td>
            <td class="p-4 text-right text-rose-500">- ${basicCOI.toFixed(2)}</td>
            ${mhseCell}
            <td class="p-4 text-right font-bold ${isLapsed ? 'text-red-600' : 'text-slate-800'}">${currentBalance.toFixed(2)}</td>
        </tr>`;
        
        resultsBody.innerHTML += row;

        // Stop projection if policy lapses
        if (isLapsed) {
            let colSpan = includeMHSE ? 5 : 4;
            resultsBody.innerHTML += `<tr><td colspan="${colSpan}" class="p-4 text-center text-red-600 font-bold bg-red-100 rounded-b-xl">Policy Lapses at Age ${age}</td></tr>`;
            break;
        }
    }
}
