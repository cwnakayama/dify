import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import Toast from '@/app/components/base/toast'
import style from './page.module.css'
import classNames from '@/utils/classnames'
import { IS_CE_EDITION, SUPPORT_MAIL_LOGIN, apiPrefix, emailRegex } from '@/config'
import Button from '@/app/components/base/button'
import { login, oauth } from '@/service/common'
import { getPurifyHref } from '@/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { RiDoorLockLine } from '@remixicon/react'
import Loading from '../components/base/loading'
import MailAndCodeAuth from './components/mail-and-code-auth'
import MailAndPasswordAuth from './components/mail-and-password-auth'
import SocialAuth from './components/social-auth'
import SSOAuth from './components/sso-auth'
import cn from '@/utils/classnames'
import { getSystemFeatures, invitationCheck } from '@/service/common'
import { defaultSystemFeatures } from '@/types/feature'
import useSWR from 'swr'

type IState = {
  formValid: boolean
  github: boolean
  google: boolean
  microsoft_entra: boolean
}

type IAction = {
  type: 'login' | 'login_failed' | 'github_login' | 'github_login_failed' | 'google_login' | 'google_login_failed' | 'microsoft_entra_login' | 'microsoft_entra_login_failed'
}

function reducer(state: IState, action: IAction) {
  switch (action.type) {
    case 'login':
      return {
        ...state,
        formValid: true,
      }
    case 'login_failed':
      return {
        ...state,
        formValid: true,
      }
    case 'github_login':
      return {
        ...state,
        github: true,
      }
    case 'github_login_failed':
      return {
        ...state,
        github: false,
      }
    case 'google_login':
      return {
        ...state,
        google: true,
      }
    case 'google_login_failed':
      return {
        ...state,
        google: false,
      }
    case 'microsoft_entra_login':
      return {
        ...state,
        microsoft_entra: true,
      }
    case 'microsoft_entra_login_failed':
      return {
        ...state,
        microsoft_entra: false,
      }
    default:
      throw new Error('Unknown action.')
  }
}

const NormalForm = () => {
  const { t } = useTranslation()
  const useEmailLogin = IS_CE_EDITION || SUPPORT_MAIL_LOGIN
  const useMicrosoftEntraLogin = true
  const router = useRouter()
  const searchParams = useSearchParams()
  const consoleToken = decodeURIComponent(searchParams.get('access_token') || '')
  const refreshToken = decodeURIComponent(searchParams.get('refresh_token') || '')
  const message = decodeURIComponent(searchParams.get('message') || '')
  const invite_token = decodeURIComponent(searchParams.get('invite_token') || '')
  const [isLoading, setIsLoading] = useState(true)
  const [systemFeatures, setSystemFeatures] = useState(defaultSystemFeatures)
  const [authType, updateAuthType] = useState<'code' | 'password'>('password')
  const [showORLine, setShowORLine] = useState(false)
  const [allMethodsAreDisabled, setAllMethodsAreDisabled] = useState(false)
  const [workspaceName, setWorkSpaceName] = useState('')

  const [state, dispatch] = useReducer(reducer, {
    formValid: false,
    github: false,
    google: false,
    microsoft_entra: false,
  })
  const isInviteLink = Boolean(invite_token && invite_token !== 'null')

  const init = useCallback(async () => {
    try {
      if (consoleToken && refreshToken) {
        localStorage.setItem('console_token', consoleToken)
        localStorage.setItem('refresh_token', refreshToken)
        router.replace('/apps')
        return
      }

      if (message) {
        Toast.notify({
          type: 'error',
          message,
        })
      }
      const features = await getSystemFeatures()
      const allFeatures = { ...defaultSystemFeatures, ...features }
      setSystemFeatures(allFeatures)
      setAllMethodsAreDisabled(!allFeatures.enable_social_oauth_login && !allFeatures.enable_email_code_login && !allFeatures.enable_email_password_login && !allFeatures.sso_enforced_for_signin)
      setShowORLine((allFeatures.enable_social_oauth_login || allFeatures.sso_enforced_for_signin) && (allFeatures.enable_email_code_login || allFeatures.enable_email_password_login))
      updateAuthType(allFeatures.enable_email_password_login ? 'password' : 'code')
      if (isInviteLink) {
        const checkRes = await invitationCheck({
          url: '/activate/check',
          params: {
            token: invite_token,
          },
        })
        setWorkSpaceName(checkRes?.data?.workspace_name || '')
      }
    }
    catch (error) {
      console.error(error)
      setAllMethodsAreDisabled(true)
      setSystemFeatures(defaultSystemFeatures)
    }
    finally { setIsLoading(false) }
  }, [consoleToken, refreshToken, message, router, invite_token, isInviteLink])
  useEffect(() => {
    init()
  }, [init])
  if (isLoading || consoleToken) {
    return <div className={
      cn(
        'flex flex-col items-center w-full grow justify-center',
        'px-6',
        'md:px-[108px]',
      )
    }>
      <Loading type='area' />
    </div>
  }

  const { data: github, error: github_error } = useSWR(state.github
    ? ({
      url: '/oauth/login/github',
      // params: {
      //   provider: 'github',
      // },
    })
    : null, oauth)

  const { data: google, error: google_error } = useSWR(state.google
    ? ({
      url: '/oauth/login/google',
      // params: {
      //   provider: 'google',
      // },
    })
    : null, oauth)

  const { data: microsoft_entra, error: microsoft_entra_error } = useSWR(state.microsoft_entra
    ? ({
      url: '/oauth/login/microsoft_entra',
      // params: {
      //   provider: 'microsoft_entra',
      // },
    })
    : null, oauth)

  useEffect(() => {
    if (github_error !== undefined)
      dispatch({ type: 'github_login_failed' })
    if (github)
      window.location.href = github.redirect_url
  }, [github, github_error])

  useEffect(() => {
    if (google_error !== undefined)
      dispatch({ type: 'google_login_failed' })
    if (google)
      window.location.href = google.redirect_url
  }, [google, google_error])

  useEffect(() => {
    if (microsoft_entra_error !== undefined)
      dispatch({ type: 'microsoft_entra_login_failed' })
    if (microsoft_entra)
      window.location.href = microsoft_entra.redirect_url
  })

  return (
    <>
      <div className="w-full mx-auto mt-8">
        {isInviteLink
          ? <div className="w-full mx-auto">
            <h2 className="title-4xl-semi-bold text-text-primary">{t('login.join')}{workspaceName}</h2>
            <p className='mt-2 body-md-regular text-text-tertiary'>{t('login.joinTipStart')}{workspaceName}{t('login.joinTipEnd')}</p>
          </div>
          : <div className="w-full mx-auto">
            <h2 className="title-4xl-semi-bold text-text-primary">{t('login.pageTitle')}</h2>
            <p className='mt-2 body-md-regular text-text-tertiary'>{t('login.welcome')}</p>
          </div>}
        <div className="bg-white">
          <div className="flex flex-col gap-3 mt-6">
            {systemFeatures.enable_social_oauth_login && <SocialAuth />}
            {systemFeatures.sso_enforced_for_signin && <div className='w-full'>
              <SSOAuth protocol={systemFeatures.sso_enforced_for_signin_protocol} />
            </div>}
          </div>

          {showORLine && <div className="relative mt-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className='bg-gradient-to-r from-background-gradient-mask-transparent via-divider-regular to-background-gradient-mask-transparent h-px w-full'></div>
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 text-text-tertiary system-xs-medium-uppercase bg-white">{t('login.or')}</span>
            </div>
          </div>}
          {
            (systemFeatures.enable_email_code_login || systemFeatures.enable_email_password_login) && <>
              {systemFeatures.enable_email_code_login && authType === 'code' && <>
                <MailAndCodeAuth isInvite={isInviteLink} />
                {systemFeatures.enable_email_password_login && <div className='cursor-pointer py-1 text-center' onClick={() => { updateAuthType('password') }}>
                  <span className='system-xs-medium text-components-button-secondary-accent-text'>{t('login.usePassword')}</span>
                </div>}
              </>}
              {systemFeatures.enable_email_password_login && authType === 'password' && <>
                <MailAndPasswordAuth isInvite={isInviteLink} allowRegistration={systemFeatures.is_allow_register} />
                {systemFeatures.enable_email_code_login && <div className='cursor-pointer py-1 text-center' onClick={() => { updateAuthType('code') }}>
                  <span className='system-xs-medium text-components-button-secondary-accent-text'>{t('login.useVerificationCode')}</span>
                </div>}
              </>}
            </>
          }

          {useMicrosoftEntraLogin && (
            <div className="flex flex-col gap-3 mt-4 mb-5">
              <div className='w-full'>
                <div className='text-center text-sm text-gray-900 font-semibold'>{t('login.or')}</div>
              </div>
              <div className='w-full'>
                <a href={getPurifyHref(`${apiPrefix}/oauth/login/microsoft_entra`)}>
                  <Button
                    disabled={isLoading}
                    className='w-full hover:!bg-gray-50'
                  >
                    <>
                      <span className={
                        classNames(
                          style.microsoftEntraIcon,
                          'w-5 h-5 mr-2',
                        )
                      } />
                      <span className="truncate text-gray-800">{t('login.withMicrosoftEntra')}</span>
                    </>
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/*  agree to our Terms and Privacy Policy. */}
          <div className="w-hull text-center block mt-2 text-xs text-gray-600">
            {t('login.tosDesc')}
            &nbsp;
            <Link
              className='system-xs-medium text-text-secondary hover:underline'
              target='_blank' rel='noopener noreferrer'
              href='https://dify.ai/terms'
            >{t('login.tos')}</Link>
            &nbsp;&&nbsp;
            <Link
              className='system-xs-medium text-text-secondary hover:underline'
              target='_blank' rel='noopener noreferrer'
              href='https://dify.ai/privacy'
            >{t('login.pp')}</Link>
          </div>
          {IS_CE_EDITION && <div className="w-hull block mt-2 system-xs-regular text-text-tertiary">
            {t('login.goToInit')}
            &nbsp;
            <Link
              className='system-xs-medium text-text-secondary hover:underline'
              href='/install'
            >{t('login.setAdminAccount')}</Link>
          </div>}

        </div>
      </div>
    </>
  )
}

export default NormalForm
