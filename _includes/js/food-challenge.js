const foodIcons = {
    pizza: ['2021-06-06', null],
    burger: ['2021-06-05', null],
    'french-fries': ['2021-06-05', null],
    beer: ['2021-06-08', null],
    soda: ['2021-02-06', null],
    cupcake: ['2021-02-07', null],
};

window.addEventListener('load', () => {
    Object.entries(foodIcons).forEach(([foodName, dates]) => {
        const foodDiv = document.querySelector(`[data-food='${foodName}']`);
        if (foodDiv) {
            let spanElt = foodDiv.getElementsByClassName('date');
            if (spanElt.length) {
                let reference = (dates[1] === null) ? new Date() : new Date(dates[1]);
                const diffInDays = Math.floor((new Date(reference) - new Date(dates[0])) / (60 * 60 * 24 * 1000));
                let numDaysDescription;
                if (diffInDays === 0) numDaysDescription = 'Today';
                else if (diffInDays === 1) numDaysDescription = 'Yesterday';
                else numDaysDescription = `${diffInDays} days ago`;
                spanElt[0].textContent = numDaysDescription;
            }
        }
    });
});

