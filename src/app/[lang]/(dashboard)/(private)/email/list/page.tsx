// app/[lang]/(dashboard)/(private)/customers/list/page.tsx

import fetchEmails from '@/libs/fetchemails'
import { getAuthUser } from '@/utils/backend-helper'
import CustomersList from '@/views/apps/customers/list'

export const dynamic = 'force-dynamic'

interface Props {
    searchParams: {
        page?: string
        pageSize?: string
    }
}

const EmailsPage = async ({ searchParams }: Props) => {
    const user = await getAuthUser()

    // alert(user.id)
     
    const page = parseInt(searchParams.page || '1', 10)
    const pageSize = parseInt(searchParams.pageSize || '10', 10)

    const { emails, totalRecords, totalPages } = await fetchEmails(String(user?.id), page, pageSize)


    return (
        <div>
            <CustomersList
                emails={emails  as any}
                totalRecords={totalRecords}
                totalPages={totalPages}
                page={page}
                pageSize={pageSize}
            />
        </div>
    )

}

export default EmailsPage
