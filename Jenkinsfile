pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                echo "Building branch: ${env.BRANCH_NAME}"
                sh 'echo "Build command goes here"'
            }
        }

        stage('Test') {
            steps {
                echo 'Running tests...'
                sh 'echo "Test command goes here"'
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                echo 'Deploying application from main branch...'
                sh 'echo "Deployment command goes here"'
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed.'
        }
    }
}
