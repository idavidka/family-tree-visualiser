export type TagSpecifierType = 'Starts with' | 'Ends with' | 'Contains' | 'Exact'
export type TagNameType = 'Givenname' | 'Surname' | 'Fullname' | 'Also known as' | 'Suffix'
export type TagInputType = TagSpecifierType | TagNameType

export interface TagInputData {
    type?: TagInputType[],
    value: string,
    displayValue?: string,
    display?: string
}