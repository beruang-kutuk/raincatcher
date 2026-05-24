const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
});

const shortDateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
});

export function formatCurrentDateTime(date = new Date()) {
    return dateTimeFormatter.format(date);
}

export function formatCurrentDate(date = new Date()) {
    return dateFormatter.format(date);
}

export function formatCurrentTime(date = new Date()) {
    return timeFormatter.format(date);
}

export function formatShortDate(date = new Date()) {
    return shortDateFormatter.format(date);
}

export function formatDateRange(days = 7, startDate = new Date()) {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + Math.max(days - 1, 0));
    return `${formatCurrentDate(startDate)} - ${formatCurrentDate(endDate)}`;
}

export function getProjectionDays(days = 7, startDate = new Date()) {
    return Array.from({ length: days }, (_, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);

        return {
            day: index === 0 ? "Today" : date.toLocaleDateString(undefined, { weekday: "short" }),
            date: formatShortDate(date),
            label: `${formatShortDate(date)}`,
        };
    });
}

