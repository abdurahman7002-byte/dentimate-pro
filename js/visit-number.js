function generateVisitNumberMap(visits){

    const visitNumberMap = new Map();

    const visitsByDay = {};


    visits.forEach(v => {

        if (!v.appointment_start) {
            return;
        }


        const start =
            new Date(
                v.appointment_start
            );


        if (
            Number.isNaN(
                start.getTime()
            )
        ){
            return;
        }


        const dayKey =
            start.getFullYear() +
            "-" +
            String(
                start.getMonth() + 1
            ).padStart(2, "0") +
            "-" +
            String(
                start.getDate()
            ).padStart(2, "0");


        if (!visitsByDay[dayKey]){
            visitsByDay[dayKey] = [];
        }


        visitsByDay[dayKey].push(v);

    });


    Object.values(
        visitsByDay
    ).forEach(dayVisits => {

        dayVisits.sort(
            (a, b) => {

                const aStart =
                    new Date(
                        a.appointment_start
                    ).getTime();

                const bStart =
                    new Date(
                        b.appointment_start
                    ).getTime();


                if (
                    aStart !== bStart
                ){
                    return (
                        aStart -
                        bStart
                    );
                }


                return (
                    Number(a.id) -
                    Number(b.id)
                );

            }
        );


        dayVisits.forEach(
            (visit, index) => {

                visitNumberMap.set(
                    visit.id,
                    index + 1
                );

            }
        );

    });


    return visitNumberMap;
}