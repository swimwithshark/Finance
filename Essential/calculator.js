async function calculate() {
    // 1. Load data
    const [coiData, mhseData] = await Promise.all([
        fetch('coi.json').then(res => res.json()),
        fetch('mhse.json').then(res => res.json())
    ]);

    // 2. Get Inputs
    const entryAge = parseInt(document.getElementById('entryAge').value);
    const premium = parseFloat(document.getElementById('annualPremium').value);
    const gender = document.getElementById('gender').value;
    const isSmoker = document.getElementById('smoking').value === 'Smoker';

    let currentBalance = 0;
    const adminCharge = 60;
    const resultsBody = document.getElementById('resultsBody');
    resultsBody.innerHTML = '';

    // 3. Projection Loop (for 20 years)
    for (let i = 0; i < 20; i++) {
        let age = entryAge + i;
        
        // Allocation logic from Excel
        let allocationRate = 0.6;
        if (i >= 3) allocationRate = 0.8;
        if (i >= 6) allocationRate = 0.95;
        if (i >= 8) allocationRate = 1.0;

        let nettPremium = premium * allocationRate;
        
        // Fetch Rates
        let coiRow = coiData.find(d => d.Age === age) || { Male_NS: 10 };
        let mhseRow = mhseData.find(d => d.Age === age) || { Male: 3000 };
        
        let basicCOI = isSmoker ? coiRow.Male_S : coiRow.Male_NS; // Simplified for Male example
        let mhseCost = gender === 'Male' ? mhseRow.Male : mhseRow.Female;

        // Balance calculation
        currentBalance += nettPremium;
        currentBalance -= (basicCOI + (mhseCost * 0.6) + adminCharge); // N.NCD factor applied

        // UI Update
        const row = `<tr>
            <td class="p-2 border">${age}</td>
            <td class="p-2 border">${nettPremium.toFixed(2)}</td>
            <td class="p-2 border">${basicCOI.toFixed(2)}</td>
            <td class="p-2 border">${mhseCost.toFixed(2)}</td>
            <td class="p-2 border font-bold">${currentBalance.toFixed(2)}</td>
        </tr>`;
        resultsBody.innerHTML += row;

        if (currentBalance < 0) break; // Policy Lapses
    }
}
