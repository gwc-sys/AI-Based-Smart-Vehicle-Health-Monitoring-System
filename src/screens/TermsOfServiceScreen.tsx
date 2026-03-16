import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface TermsOfServiceScreenProps {
  onClose?: () => void;
  onAgree?: () => void;
}

const TermsOfServiceScreen: React.FC<TermsOfServiceScreenProps> = ({ onClose, onAgree }) => {
  const navigation = useNavigation<any>();

  const handleGoBack = (): void => {
    if (onClose) {
      onClose();
      return;
    }

    navigation.goBack();
  };

  const handleIAgree = (): void => {
    if (onAgree) {
      onAgree();
    }
    handleGoBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} accessibilityLabel="Go back">
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.lastUpdated}>Last Updated: March 2026</Text>

          <Section
            title="1. Agreement to Terms"
            content={`These Terms of Service ("Terms") constitute a legally binding agreement between you and AI Vehicle Health Monitoring App ("Company," "we," "us," "our"). By accessing and using our mobile application and services, you accept and agree to be bound by and comply with these Terms and our Privacy Policy.

If you do not agree to these Terms, you must not use our application. Your continued use of the application signifies your acceptance of these Terms.`}
          />

          <Section
            title="2. Use License"
            content={`We grant you a limited, non-exclusive, non-transferable, revocable license to:

• Download and install the application on your personal mobile device
• Use the application for personal, non-commercial purposes
• Access and view the content and information provided

This license does not permit you to:
• Modify, adapt, translate, or create derivative works
• Reverse engineer, decompile, or disassemble the application
• Remove or alter any proprietary notices or labels
• Use the application for commercial purposes
• Rent, lease, or transfer the application
• Create unauthorized copies or distribute the application
• Use the application in any manner that could damage or disable our services`}
          />

          <Section
            title="3. User Responsibilities and Account"
            content={`By creating an account, you agree to:

• Provide accurate, current, and complete information
• Maintain the confidentiality of your password
• Accept responsibility for all activities under your account
• Immediately notify us of unauthorized access
• Use the application only for lawful purposes
• Comply with all applicable laws and regulations
• Not engage in harmful, abusive, or illegal activities
• Act responsibly and respect other users' rights

You are responsible for maintaining the confidentiality of your login credentials and are fully responsible for all activities that occur under your account.`}
          />

          <Section
            title="4. Acceptable Use Policy"
            content={`You agree NOT to:

• Transmit any unlawful, defamatory, abusive, obscene, or offensive content
• Harass, threaten, or harm other users
• Attempt to gain unauthorized access to our systems
• Create multiple accounts to circumvent restrictions
• Impersonate any person or entity
• Engage in fraud, phishing, or deceptive practices
• Share personal information of others without consent
• Use automated bots or scraping tools
• Violate intellectual property rights
• Interfere with or disrupt the application's functionality
• Spam or send unsolicited messages
• Engage in any form of cyberbullying or harassment

Violations of this policy will result in account suspension or termination.`}
          />

          <Section
            title="5. Vehicle Data and Sensor Information"
            content={`• Ownership: You warrant that you own or have authority to monitor the vehicles registered in your account
• Consent: You confirm you have the legal right to share vehicle sensor data with us
• Accuracy: You agree to maintain accurate vehicle information
• Use: We use collected sensor data to provide vehicle health monitoring services
• Data Security: We implement industry-standard security measures
• Third-Party Data: Vehicle data is not shared without your explicit consent
• Commercial Use: You may not use vehicle data for commercial purposes without authorization
• Liability: You are responsible for ensuring proper vehicle maintenance based on our alerts`}
          />

          <Section
            title="6. Disclaimers"
            content={`The application and all content are provided on an "AS IS" and "AS AVAILABLE" basis. We disclaim all warranties, express or implied, including:

• Merchantability and fitness for a particular purpose
• Accuracy, completeness, or reliability of information
• Uninterrupted or error-free service
• Freedom from viruses or harmful components

The application may contain technical inaccuracies. Information is provided without warranty and may include inaccuracies or typographical errors. We are not responsible for outdated information.

Vehicle health predictions and alerts are provided for informational purposes only and do not replace professional mechanical inspection. Always consult with qualified vehicle mechanics for maintenance decisions.`}
          />

          <Section
            title="7. Limitation of Liability"
            content={`To the maximum extent permitted by law, we shall not be liable for:

• Indirect, incidental, consequential, special, or punitive damages
• Loss of profits, data, or business opportunities
• Damages arising from service interruptions or delays
• Third-party actions or content
• Vehicle damage or mechanical failures
• Missed alerts or delayed notifications
• Loss of vehicle location tracking data

Our total liability shall not exceed the amount you paid for the service in the past 12 months.

Some jurisdictions do not allow disclaimer of implied warranties or limitation of liability, so the above disclaimers may not apply to you.`}
          />

          <Section
            title="8. Indemnification"
            content={`You agree to indemnify, defend, and hold harmless the Company, its officers, directors, employees, agents, and affiliates from any claims, damages, losses, liabilities, and expenses arising from:

• Your use of the application
• Your violation of these Terms
• Your infringement of any third-party rights
• Your violation of any applicable laws
• Your vehicle information or data
• Your actions or conduct on the platform

This indemnification obligation applies only to claims that arise from your actions, not from our actions or negligence.`}
          />

          <Section
            title="9. Intellectual Property Rights"
            content={`All content in the application, including text, graphics, logos, images, software code, and audio, is the property of the Company or its content providers and is protected by international copyright laws.

• You retain ownership of any content you submit
• By submitting content, you grant us a worldwide, royalty-free license to use it
• You warrant that you own all rights to submitted content
• You may not reproduce, distribute, or transmit any content without permission

Our trademarks, service marks, and logos displayed in the application are registered trademarks of the Company. Unauthorized use is prohibited.`}
          />

          <Section
            title="10. Third-Party Links and Services"
            content={`The application may contain links to third-party websites and services. We are not responsible for:

• Content, accuracy, or practices of third-party sites
• Security or privacy of third-party platforms
• Your interactions with third parties
• Any claims arising from third-party services

Your use of third-party services is subject to their terms and policies. We recommend reviewing their privacy and terms before use.`}
          />

          <Section
            title="11. Modification of Terms"
            content={`We reserve the right to modify these Terms at any time. We will notify you of material changes by:

• Updating the "Last Updated" date
• Sending an email notification to your registered address
• Displaying a prominent notice in the application

Your continued use of the application after modifications constitute acceptance of the updated Terms. It is your responsibility to review these Terms periodically.`}
          />

          <Section
            title="12. Termination"
            content={`We reserve the right to suspend or terminate your account and access to the application at any time, without notice, for:

• Violation of these Terms
• Illegal or harmful activities
• Non-payment of subscription fees
• Inactivity (90+ days without login)
• At our sole discretion

Upon termination:
• Your access to the application will be revoked
• Your data will be retained per our Privacy Policy
• Subscription fees are non-refundable unless required by law
• You remain liable for any violations prior to termination`}
          />

          <Section
            title="13. Payment Terms"
            content={`For paid services:

• All fees are exclusive of applicable taxes
• Billing occurs on the date specified during subscription
• Payment methods must be kept current
• Failed payments may result in service suspension
• Refunds are subject to our refund policy
• Automatic renewal occurs unless you cancel
• Cancellation takes effect at the end of the current billing period
• No refunds for partial periods`}
          />

          <Section
            title="14. Governing Law and Disputes"
            content={`These Terms are governed by and construed in accordance with applicable local laws.

Dispute Resolution:
• Informal Resolution: First, attempt to resolve disputes through good faith negotiation
• Arbitration: Disputes will be resolved through binding arbitration
• Class Action Waiver: You and the Company waive the right to class action litigation
• Jurisdiction: Arbitration will be conducted in accordance with applicable rules

By agreeing to these Terms, you waive your right to sue in court or have a jury trial.`}
          />

          <Section
            title="15. Severability"
            content={`If any provision of these Terms is found to be invalid, illegal, or unenforceable, such provision will be modified to the minimum extent necessary to make it valid, or if not possible, severed from these Terms.

The remaining provisions will continue in full force and effect.`}
          />

          <Section
            title="16. Entire Agreement"
            content={`These Terms, together with our Privacy Policy, constitute the entire agreement between you and the Company regarding the application and supersede all prior agreements and understandings.`}
          />

          <Section
            title="17. Contacting Us"
            content={`If you have questions about these Terms, please contact us:

Email: support@vehiclehealth.com
Address: AI Vehicle Health Monitoring Team
Support Portal: www.vehiclehealth.com/support
Phone: 1-800-VEHICLE-1 (1-800-834-2835)
Legal Department: legal@vehiclehealth.com

Response Time: We will respond to all inquiries within 48 business hours.`}
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.agreeButton}
              onPress={handleIAgree}
              activeOpacity={0.8}
              accessibilityLabel="I agree to terms of service"
              accessibilityHint="Accept terms of service and return to registration"
            >
              <Text style={styles.agreeButtonText}>I Agree and Accept</Text>
            </TouchableOpacity>
            <Text style={styles.footerText}>
              Last Updated: March 2026. These Terms are subject to change without notice.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Reusable Section Component
interface SectionProps {
  title: string;
  content: string;
}

const Section: React.FC<SectionProps> = ({ title, content }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionContent}>{content}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
    lineHeight: 22,
  },
  sectionContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  footer: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
  agreeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  agreeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TermsOfServiceScreen;
