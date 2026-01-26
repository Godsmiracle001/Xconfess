
import xss from 'xss';

export const sanitize = (value: string) => xss(value);
