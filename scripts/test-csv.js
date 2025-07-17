import { format } from '@fast-csv/format';

const stream = format({ headers: true });
stream.pipe(process.stdout);
stream.write({ name: 'Alice', age: 30 });
stream.end();